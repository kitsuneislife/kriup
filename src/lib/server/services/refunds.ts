// Refund requests (RF-30 to RF-36, RN-06 to RN-10). domain/refund.ts decides each step;
// this file loads, locks, saves and moves the money. An approved refund is settled with
// the provider and then completed; a failed settlement stays approved for the daily job.

import { and, asc, desc, eq, inArray, lte } from 'drizzle-orm';
import { z } from 'zod';
import * as rules from '../../domain/refund';
import { splitRefund } from '../../domain/split';
import {
	assertTransition,
	DomainError,
	ENROLLMENT_TRANSITIONS,
	ORDER_TRANSITIONS
} from '../../domain/states';
import type { SessionUser } from '../auth/session';
import type { Ctx } from '../context';
import type { Tx } from '../db/client';
import {
	coproduction,
	enrollment,
	ledgerEntry,
	message,
	order,
	product,
	refund,
	user
} from '../db/schema';
import { assertFound, NotFoundError, PG, translate } from '../errors';
import { audit } from './blocks';
import type { EventOutcome } from './payments';

const reasonSchema = z.string().trim().min(1).max(2_000);

export const requestRefundSchema = z.object({ orderId: z.uuid(), reason: reasonSchema });

export const decisionSchema = z.discriminatedUnion('decision', [
	z.object({ decision: z.literal('approve') }),
	z.object({ decision: z.literal('decline'), reason: reasonSchema })
]);

type RefundRow = typeof refund.$inferSelect;

const toRules = (r: RefundRow): rules.Refund => ({
	status: r.status,
	owner: r.owner,
	dueAt: r.dueAt,
	contested: r.contested,
	declineReason: r.declineReason
});

/** The refund with what ownership checks need, locked for the rest of the transaction. */
async function lockRefund(tx: Tx, refundId: string) {
	const [row] = await tx
		.select({
			refund,
			studentId: order.studentId,
			producerId: product.producerId,
			externalId: order.externalId
		})
		.from(refund)
		.innerJoin(order, eq(order.id, refund.orderId))
		.innerJoin(product, eq(product.id, order.productId))
		.where(eq(refund.id, refundId))
		.for('update', { of: refund });
	return row;
}

async function saveStep(tx: Tx, current: RefundRow, next: rules.Refund, now: Date) {
	await tx
		.update(refund)
		.set({ ...next, firstResponseAt: current.firstResponseAt ?? now })
		.where(eq(refund.id, current.id));
}

// ---------------------------------------------------------------------------
// Student

/** RF-30 to RF-32: inside the guarantee it is approved and settled at once (RN-03). */
export async function requestRefund(
	ctx: Ctx,
	studentId: string,
	input: z.input<typeof requestRefundSchema>,
	now = new Date()
): Promise<string> {
	const { orderId, reason } = requestRefundSchema.parse(input);
	const created = await ctx.db.transaction(async (tx) => {
		const [row] = await tx
			.select()
			.from(order)
			.where(and(eq(order.id, orderId), eq(order.studentId, studentId)))
			.for('update');
		const found = assertFound(row, 'order');
		if (found.status !== 'paid' || found.paidAt === null) {
			throw new DomainError('order_not_refundable', `a ${found.status} order is not refundable`);
		}
		const opened = rules.openRefund(found.paidAt, now, found.guaranteeDays);
		const [inserted] = await translate(
			tx
				.insert(refund)
				.values({
					orderId,
					reason,
					...opened,
					openedAt: now,
					firstResponseAt: opened.status === 'approved' ? now : null
				})
				.returning({ id: refund.id, status: refund.status }),
			[{ code: PG.UNIQUE, error: 'refund_exists' }]
		);
		return inserted!;
	});
	if (created.status === 'approved') await settle(ctx, created.id, now);
	return created.id;
}

/** RN-09: one contest of a producer's decline, straight to support. */
export async function contestRefund(
	ctx: Ctx,
	studentId: string,
	refundId: string,
	now = new Date()
) {
	await ctx.db.transaction(async (tx) => {
		const row = await lockRefund(tx, refundId);
		if (!row || row.studentId !== studentId) throw new NotFoundError('refund not found');
		await saveStep(tx, row.refund, rules.contest(toRules(row.refund), now), now);
	});
}

// ---------------------------------------------------------------------------
// Producer and support (RF-33, RF-34)

export async function producerDecision(
	ctx: Ctx,
	producerId: string,
	refundId: string,
	input: z.input<typeof decisionSchema>,
	now = new Date()
) {
	const choice = decisionSchema.parse(input);
	const approved = await ctx.db.transaction(async (tx) => {
		const row = await lockRefund(tx, refundId);
		if (!row || row.producerId !== producerId) throw new NotFoundError('refund not found');
		const current = toRules(row.refund);
		const next =
			choice.decision === 'approve'
				? rules.approve(current, 'producer', now)
				: rules.decline(current, 'producer', choice.reason, now);
		await saveStep(tx, row.refund, next, now);
		return next.status === 'approved';
	});
	if (approved) await settle(ctx, refundId, now);
}

/** RN-08 and RN-09: support decides an escalated or contested request; audited (RF-62). */
export async function supportDecision(
	ctx: Ctx,
	supportId: string,
	refundId: string,
	input: z.input<typeof decisionSchema>,
	now = new Date()
) {
	const choice = decisionSchema.parse(input);
	const approved = await ctx.db.transaction(async (tx) => {
		const row = assertFound(await lockRefund(tx, refundId), 'refund');
		const current = toRules(row.refund);
		const next =
			choice.decision === 'approve'
				? rules.approve(current, 'platform', now)
				: rules.decline(current, 'platform', choice.reason, now);
		await saveStep(tx, row.refund, next, now);
		await audit(tx, supportId, `refund.${choice.decision}`, { refundId, ...choice });
		return next.status === 'approved';
	});
	if (approved) await settle(ctx, refundId, now);
}

// ---------------------------------------------------------------------------
// Settlement (RF-36, RN-06, RN-07)

/**
 * Returns the money through the provider, then completes the refund. A provider failure
 * leaves it approved; `retryApprovedRefunds` tries again and the `refunded` webhook
 * completes it too, whichever comes first.
 */
async function settle(ctx: Ctx, refundId: string, now: Date) {
	const [row] = await ctx.db
		.select({ externalId: order.externalId, orderId: order.id })
		.from(refund)
		.innerJoin(order, eq(order.id, refund.orderId))
		.where(eq(refund.id, refundId));
	const found = assertFound(row, 'refund');
	if (found.externalId === null) throw new Error(`paid order ${found.orderId} has no charge`);
	try {
		await ctx.payments.refund(found.externalId);
	} catch (err) {
		console.error('[refund] provider refund failed; the daily job retries', { refundId, err });
		return;
	}
	await ctx.db.transaction((tx) => completeRefund(tx, found.orderId, now));
}

/**
 * RN-06 in one transaction: each sale entry is reversed, each party gets a reversal of
 * its part of the fixed fee the platform keeps, the order is refunded and access revoked.
 * Released money already withdrawn can leave the balance negative (RN-07).
 */
async function completeRefund(tx: Tx, orderId: string, now: Date): Promise<EventOutcome> {
	const [ord] = await tx.select().from(order).where(eq(order.id, orderId)).for('update');
	const [req] = await tx.select().from(refund).where(eq(refund.orderId, orderId)).for('update');
	if (!ord || !req) throw new Error(`refund of order ${orderId} not found`);
	if (req.status === 'completed') return 'ignored';
	const done = rules.complete(toRules(req));
	assertTransition(ORDER_TRANSITIONS, ord.status, 'refunded');

	const sales = await tx
		.select({
			id: ledgerEntry.id,
			userId: ledgerEntry.userId,
			amountCents: ledgerEntry.amountCents,
			coproductionId: ledgerEntry.coproductionId,
			bp: coproduction.percentBp
		})
		.from(ledgerEntry)
		.leftJoin(coproduction, eq(coproduction.id, ledgerEntry.coproductionId))
		.where(and(eq(ledgerEntry.orderId, orderId), eq(ledgerEntry.type, 'sale')))
		.orderBy(asc(ledgerEntry.createdAt));
	const producerSale = sales.find((s) => s.coproductionId === null);
	const coproducerSales = sales.filter((s) => s.coproductionId !== null);
	if (!producerSale) throw new Error(`order ${orderId} has no producer sale entry`);

	const back = splitRefund(
		ord.grossCents,
		ord.feeCents,
		coproducerSales.map((s) => s.bp!)
	);
	const keptCents = ord.feeCents - back.platformCents;
	const parts = coproducerSales.map((s, i) => ({
		sale: s,
		cents: back.coproducerCents[i]! - s.amountCents
	}));
	// A coproducer whose share rounded to zero has no sale entry; its cent stays with the
	// producer, so the reversals always add up to the fee kept.
	parts.push({ sale: producerSale, cents: keptCents - parts.reduce((sum, p) => sum + p.cents, 0) });

	const reversals = parts.filter((p) => p.cents > 0);
	if (reversals.length > 0) {
		await tx.insert(ledgerEntry).values(
			reversals.map((p) => ({
				type: 'reversal' as const,
				state: 'released' as const,
				userId: p.sale.userId,
				amountCents: -p.cents,
				orderId,
				referenceId: p.sale.id,
				coproductionId: p.sale.coproductionId,
				reason: 'Reembolso: parte da taxa fixa, que a plataforma não devolve'
			}))
		);
	}
	await tx
		.update(ledgerEntry)
		.set({ state: 'reversed' })
		.where(
			inArray(
				ledgerEntry.id,
				sales.map((s) => s.id)
			)
		);
	await tx.update(order).set({ status: 'refunded' }).where(eq(order.id, orderId));
	const [enr] = await tx.select().from(enrollment).where(eq(enrollment.orderId, orderId));
	if (enr) {
		assertTransition(ENROLLMENT_TRANSITIONS, enr.status, 'revoked');
		await tx
			.update(enrollment)
			.set({ status: 'revoked', revokedAt: now })
			.where(eq(enrollment.id, enr.id));
	}
	await tx.update(refund).set({ status: done.status }).where(eq(refund.id, req.id));
	return 'applied';
}

/**
 * The provider reports a refund (webhook). Usually it confirms one approved here; if it
 * was made in the provider's panel, the money is already back with the student, so the
 * request is recorded as approved by the platform and completed.
 */
export async function completeRefundFromProvider(
	ctx: Ctx,
	externalId: string,
	now = new Date()
): Promise<EventOutcome> {
	return ctx.db.transaction(async (tx) => {
		const [ord] = await tx
			.select({ id: order.id, status: order.status })
			.from(order)
			.where(eq(order.externalId, externalId))
			.for('update');
		if (!ord) return 'unknown_charge';
		if (ord.status !== 'paid') return 'ignored';
		const [req] = await tx.select().from(refund).where(eq(refund.orderId, ord.id));
		const approvedByProvider = {
			status: 'approved' as const,
			owner: 'platform' as const,
			dueAt: now,
			firstResponseAt: req?.firstResponseAt ?? now
		};
		if (!req) {
			await tx.insert(refund).values({
				orderId: ord.id,
				reason: 'Reembolso feito diretamente no provedor de pagamento',
				openedAt: now,
				...approvedByProvider
			});
		} else if (req.status !== 'approved') {
			// The provider is the source of truth for money: its refund overrides the flow.
			await tx.update(refund).set(approvedByProvider).where(eq(refund.id, req.id));
		}
		return completeRefund(tx, ord.id, now);
	});
}

// ---------------------------------------------------------------------------
// Jobs

/** RN-08: requests past the producer's deadline go to support. */
export async function escalateOverdueRefunds(ctx: Ctx, now = new Date()): Promise<number> {
	const due = await ctx.db
		.select({ id: refund.id })
		.from(refund)
		.where(and(eq(refund.status, 'with_producer'), lte(refund.dueAt, now)));
	for (const { id } of due) {
		await ctx.db.transaction(async (tx) => {
			const row = await lockRefund(tx, id);
			if (row?.refund.status !== 'with_producer') return; // decided meanwhile
			await saveStep(tx, row.refund, rules.escalate(toRules(row.refund), now), now);
		});
	}
	return due.length;
}

/** Settles approved requests whose provider refund failed earlier. */
export async function retryApprovedRefunds(ctx: Ctx, now = new Date()): Promise<number> {
	const pending = await ctx.db
		.select({ id: refund.id })
		.from(refund)
		.where(eq(refund.status, 'approved'));
	for (const { id } of pending) await settle(ctx, id, now);
	return pending.length;
}

// ---------------------------------------------------------------------------
// Conversation and reads (RF-31)

type Party = 'student' | 'producer' | 'support';

/** Who the user is on this request, or NotFound when they have no part in it. */
async function partyOf(ctx: Ctx, viewer: SessionUser, refundId: string) {
	const [row] = await ctx.db
		.select({
			refund,
			studentId: order.studentId,
			producerId: product.producerId,
			productName: product.name,
			grossCents: order.grossCents,
			paidAt: order.paidAt
		})
		.from(refund)
		.innerJoin(order, eq(order.id, refund.orderId))
		.innerJoin(product, eq(product.id, order.productId))
		.where(eq(refund.id, refundId));
	const found = assertFound(row, 'refund');
	const party: Party | null =
		found.studentId === viewer.id
			? 'student'
			: found.producerId === viewer.id
				? 'producer'
				: viewer.platformRole === 'support'
					? 'support'
					: null;
	if (party === null) throw new NotFoundError('refund not found');
	return { ...found, party };
}

/** RF-31: status, current owner, deadline and the conversation. */
export async function getRefund(ctx: Ctx, viewer: SessionUser, refundId: string) {
	const found = await partyOf(ctx, viewer, z.uuid().parse(refundId));
	const messages = await ctx.db
		.select({
			id: message.id,
			body: message.body,
			createdAt: message.createdAt,
			authorId: message.authorId,
			authorName: user.name
		})
		.from(message)
		.innerJoin(user, eq(user.id, message.authorId))
		.where(eq(message.refundId, found.refund.id))
		.orderBy(asc(message.createdAt));
	return {
		viewerRole: found.party,
		refund: found.refund,
		order: { grossCents: found.grossCents, paidAt: found.paidAt },
		product: { name: found.productName },
		messages
	};
}

export async function addRefundMessage(
	ctx: Ctx,
	viewer: SessionUser,
	refundId: string,
	body: string
) {
	const text = reasonSchema.parse(body);
	const found = await partyOf(ctx, viewer, z.uuid().parse(refundId));
	await ctx.db
		.insert(message)
		.values({ refundId: found.refund.id, authorId: viewer.id, body: text });
}

/** RF-33: the requests on the producer's products, the ones waiting on them first. */
export async function listProducerRefunds(ctx: Ctx, producerId: string) {
	return ctx.db
		.select({
			id: refund.id,
			status: refund.status,
			owner: refund.owner,
			dueAt: refund.dueAt,
			reason: refund.reason,
			openedAt: refund.openedAt,
			productName: product.name,
			grossCents: order.grossCents,
			studentName: user.name
		})
		.from(refund)
		.innerJoin(order, eq(order.id, refund.orderId))
		.innerJoin(product, eq(product.id, order.productId))
		.innerJoin(user, eq(user.id, order.studentId))
		.where(eq(product.producerId, producerId))
		.orderBy(desc(eq(refund.status, 'with_producer')), asc(refund.dueAt));
}
