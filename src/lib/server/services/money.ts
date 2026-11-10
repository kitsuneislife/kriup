// The money panel (RF-40 to RF-45). The balance is always the sum of the entries
// (modelo-de-dados section 4), computed in the database, never stored.

import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { PAYOUT_FEE_CENTS, PAYOUT_MIN_CENTS } from '../../domain/params';
import { quotePayout } from '../../domain/payout';
import type { Balance } from '../../domain/retention';
import { assertTransition, DomainError, PAYOUT_TRANSITIONS } from '../../domain/states';
import type { Ctx } from '../context';
import type { Db, Tx } from '../db/client';
import { coproduction, entryState, ledgerEntry, order, payout, product, user } from '../db/schema';
import { assertFound } from '../errors';
import { activeBlocks, assertNotBlocked, audit } from './blocks';

export async function getBalance(db: Db | Tx, userId: string): Promise<Balance> {
	const rows = await db
		.select({ state: ledgerEntry.state, cents: sql<string>`sum(${ledgerEntry.amountCents})` })
		.from(ledgerEntry)
		.where(eq(ledgerEntry.userId, userId))
		.groupBy(ledgerEntry.state);
	const sum = (state: string) => Number(rows.find((r) => r.state === state)?.cents ?? 0);
	return { heldCents: sum('held'), releasedCents: sum('released'), paidOutCents: sum('paid_out') };
}

/**
 * RF-41, RF-42, RF-45: the three totals, what is held and until when, the blocks that
 * stop a payout with their reason and next step, and what a payout costs (RN-13).
 */
export async function getMoneyPanel(ctx: Ctx, userId: string, now = new Date()) {
	const [balance, held, blocks, payouts] = await Promise.all([
		getBalance(ctx.db, userId),
		ctx.db
			.select({
				releaseAt: ledgerEntry.releaseAt,
				amountCents: sql<string>`sum(${ledgerEntry.amountCents})`,
				entries: sql<string>`count(*)`
			})
			.from(ledgerEntry)
			.where(and(eq(ledgerEntry.userId, userId), eq(ledgerEntry.state, 'held')))
			.groupBy(ledgerEntry.releaseAt)
			.orderBy(asc(ledgerEntry.releaseAt)),
		activeBlocks(ctx.db, userId, now),
		listPayouts(ctx, userId)
	]);
	return {
		balance,
		/** Held money grouped by release date: the reason is the guarantee (RN-04). */
		releases: held.map((h) => ({
			releaseAt: h.releaseAt!,
			amountCents: Number(h.amountCents),
			entries: Number(h.entries)
		})),
		blocks: blocks.filter((b) => b.target !== 'product'),
		payout: {
			minCents: PAYOUT_MIN_CENTS,
			feeCents: PAYOUT_FEE_CENTS,
			/** Why no payout is possible right now, if so; the screen explains it (RN-07). */
			refusal: balance.releasedCents < 0 ? ('negative_balance' as const) : null
		},
		payouts
	};
}

export const statementSchema = z.object({
	productId: z.uuid().optional(),
	state: z.enum(entryState.enumValues).optional(),
	from: z.coerce.date().optional(),
	/** Exclusive. */
	to: z.coerce.date().optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(200).default(50)
});

/**
 * RF-40, RF-43, RF-53, US-04: each line with the rule behind it. Lines of a sale carry the
 * gross, the platform fee and, for a coproducer, the percentage and the producer's part.
 */
export async function getStatement(
	ctx: Ctx,
	userId: string,
	filters: z.input<typeof statementSchema> = {}
) {
	const f = statementSchema.parse(filters);
	const where = and(
		eq(ledgerEntry.userId, userId),
		f.productId ? eq(order.productId, f.productId) : undefined,
		f.state ? eq(ledgerEntry.state, f.state) : undefined,
		f.from ? gte(ledgerEntry.createdAt, f.from) : undefined,
		f.to ? lt(ledgerEntry.createdAt, f.to) : undefined
	);
	const rows = await ctx.db
		.select({
			id: ledgerEntry.id,
			type: ledgerEntry.type,
			state: ledgerEntry.state,
			amountCents: ledgerEntry.amountCents,
			reason: ledgerEntry.reason,
			releaseAt: ledgerEntry.releaseAt,
			createdAt: ledgerEntry.createdAt,
			orderId: ledgerEntry.orderId,
			payoutId: ledgerEntry.payoutId,
			referenceId: ledgerEntry.referenceId,
			productId: order.productId,
			productName: product.name,
			grossCents: order.grossCents,
			feeCents: order.feeCents,
			percentBp: coproduction.percentBp
		})
		.from(ledgerEntry)
		.leftJoin(order, eq(order.id, ledgerEntry.orderId))
		.leftJoin(product, eq(product.id, order.productId))
		.leftJoin(coproduction, eq(coproduction.id, ledgerEntry.coproductionId))
		.where(where)
		.orderBy(desc(ledgerEntry.createdAt), desc(ledgerEntry.id))
		.limit(f.pageSize + 1)
		.offset((f.page - 1) * f.pageSize);

	const page = rows.slice(0, f.pageSize);
	const coproducerOrders = page.filter((r) => r.percentBp !== null).map((r) => r.orderId!);
	const producerParts = coproducerOrders.length
		? await ctx.db
				.select({ orderId: ledgerEntry.orderId, amountCents: ledgerEntry.amountCents })
				.from(ledgerEntry)
				.where(
					and(
						inArray(ledgerEntry.orderId, coproducerOrders),
						eq(ledgerEntry.type, 'sale'),
						isNull(ledgerEntry.coproductionId)
					)
				)
		: [];
	return {
		entries: page.map((r) => ({
			...r,
			producerCents:
				r.percentBp === null
					? null
					: (producerParts.find((p) => p.orderId === r.orderId)?.amountCents ?? null)
		})),
		hasMore: rows.length > f.pageSize
	};
}

// ---------------------------------------------------------------------------
// Payouts (RF-44, RN-13)

export async function listPayouts(ctx: Ctx, userId: string) {
	return ctx.db
		.select()
		.from(payout)
		.where(eq(payout.userId, userId))
		.orderBy(desc(payout.createdAt));
}

const amountSchema = z.number().int().positive();

/** What the payout would cost, for the confirmation screen; nothing is written. */
export async function previewPayout(ctx: Ctx, userId: string, amountCents: number) {
	const { releasedCents } = await getBalance(ctx.db, userId);
	return quotePayout(releasedCents, amountSchema.parse(amountCents));
}

/**
 * The user row is locked between reading the balance and writing, so two requests never
 * spend the same money. The amount leaves the released balance at once.
 */
export async function requestPayout(
	ctx: Ctx,
	userId: string,
	amountCents: number,
	now = new Date()
): Promise<string> {
	const amount = amountSchema.parse(amountCents);
	return ctx.db.transaction(async (tx) => {
		await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
		await assertNotBlocked(tx, userId, ['balance'], null, now);
		const quote = quotePayout((await getBalance(tx, userId)).releasedCents, amount);
		if (!quote.ok) throw new DomainError(quote.reason);

		const [created] = await tx
			.insert(payout)
			.values({ userId, amountCents: quote.amountCents, feeCents: quote.feeCents })
			.returning({ id: payout.id });
		const payoutId = created!.id;
		await tx.insert(ledgerEntry).values([
			{
				userId,
				payoutId,
				type: 'payout',
				state: 'released',
				amountCents: -quote.receivedCents,
				reason: 'Saque solicitado'
			},
			{
				userId,
				payoutId,
				type: 'payout_fee',
				state: 'released',
				amountCents: -quote.feeCents,
				reason: 'Taxa de saque'
			}
		]);
		return payoutId;
	});
}

async function lockPayout(tx: Tx, payoutId: string) {
	const [row] = await tx.select().from(payout).where(eq(payout.id, payoutId)).for('update');
	return assertFound(row, 'payout');
}

/** Support confirms the transfer was made (simulated, RF-44); audited (RF-62). */
export async function completePayout(
	ctx: Ctx,
	supportId: string,
	payoutId: string,
	now = new Date()
) {
	await ctx.db.transaction(async (tx) => {
		const p = await lockPayout(tx, payoutId);
		assertTransition(PAYOUT_TRANSITIONS, p.status, 'completed');
		await tx.update(payout).set({ status: 'completed', decidedAt: now }).where(eq(payout.id, p.id));
		await tx.insert(ledgerEntry).values({
			userId: p.userId,
			payoutId: p.id,
			type: 'payout',
			state: 'paid_out',
			amountCents: p.amountCents - p.feeCents,
			reason: 'Saque concluído'
		});
		await audit(tx, supportId, 'payout.complete', { payoutId });
	});
}

/** The request's entries come back as adjustments pointing at them (RN-14); audited. */
export async function declinePayout(
	ctx: Ctx,
	supportId: string,
	payoutId: string,
	reason: string,
	now = new Date()
) {
	const why = z.string().trim().min(1).max(2_000).parse(reason);
	await ctx.db.transaction(async (tx) => {
		const p = await lockPayout(tx, payoutId);
		assertTransition(PAYOUT_TRANSITIONS, p.status, 'declined');
		await tx.update(payout).set({ status: 'declined', decidedAt: now }).where(eq(payout.id, p.id));
		const debits = await tx
			.select()
			.from(ledgerEntry)
			.where(and(eq(ledgerEntry.payoutId, p.id), eq(ledgerEntry.state, 'released')));
		await tx.insert(ledgerEntry).values(
			debits.map((d) => ({
				userId: p.userId,
				payoutId: p.id,
				type: 'adjustment' as const,
				state: 'released' as const,
				amountCents: -d.amountCents,
				referenceId: d.id,
				reason: `Saque recusado, valor devolvido: ${why}`
			}))
		);
		await audit(tx, supportId, 'payout.decline', { payoutId, reason: why });
	});
}

// ---------------------------------------------------------------------------
// Job

/** RN-04: held sales past their release date become released. Returns how many moved. */
export async function releaseHeld(ctx: Ctx, now = new Date()): Promise<number> {
	const moved = await ctx.db
		.update(ledgerEntry)
		.set({ state: 'released' })
		.where(
			and(
				eq(ledgerEntry.state, 'held'),
				eq(ledgerEntry.type, 'sale'),
				lte(ledgerEntry.releaseAt, now)
			)
		)
		.returning({ id: ledgerEntry.id });
	return moved.length;
}
