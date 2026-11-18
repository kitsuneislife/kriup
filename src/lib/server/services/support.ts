// Support (RF-35, RF-60 to RF-62). Every write by support is audited in its transaction.
// Refund and payout decisions live in refunds.ts and money.ts; they audit the same way.

import {
	and,
	asc,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNotNull,
	isNull,
	lte,
	min,
	or,
	sql
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { assertTransition, DomainError, TICKET_TRANSITIONS } from '../../domain/states';
import type { AuditTarget } from '../../support-text';
import { emailSchema } from '../auth/credentials';
import type { SessionUser } from '../auth/session';
import type { Ctx } from '../context';
import {
	auditLog,
	block,
	blockTarget,
	message,
	order,
	payout,
	product,
	refund,
	ticket,
	user
} from '../db/schema';
import { assertFound, NotFoundError, PG, translate } from '../errors';
import { assertSupport, audit } from './blocks';

const body = z.string().trim().min(1).max(5_000);

/** RF-60: escalated or contested refunds by nearest deadline, open tickets, payouts to pay. */
export async function getSupportQueue(ctx: Ctx, viewer: SessionUser) {
	assertSupport(viewer);
	const [refunds, tickets, payouts] = await Promise.all([
		ctx.db
			.select({
				id: refund.id,
				dueAt: refund.dueAt,
				contested: refund.contested,
				reason: refund.reason,
				productName: product.name,
				grossCents: order.grossCents,
				studentName: user.name
			})
			.from(refund)
			.innerJoin(order, eq(order.id, refund.orderId))
			.innerJoin(product, eq(product.id, order.productId))
			.innerJoin(user, eq(user.id, order.studentId))
			.where(eq(refund.status, 'with_platform'))
			.orderBy(asc(refund.dueAt)),
		ctx.db
			.select({
				id: ticket.id,
				subject: ticket.subject,
				createdAt: ticket.createdAt,
				studentName: user.name,
				productName: product.name
			})
			.from(ticket)
			.innerJoin(user, eq(user.id, ticket.studentId))
			.innerJoin(order, eq(order.id, ticket.orderId))
			.innerJoin(product, eq(product.id, order.productId))
			.where(eq(ticket.status, 'open'))
			.orderBy(asc(ticket.createdAt)),
		ctx.db
			.select({
				id: payout.id,
				amountCents: payout.amountCents,
				feeCents: payout.feeCents,
				createdAt: payout.createdAt,
				userName: user.name
			})
			.from(payout)
			.innerJoin(user, eq(user.id, payout.userId))
			.where(eq(payout.status, 'requested'))
			.orderBy(asc(payout.createdAt))
	]);
	return { refunds, tickets, payouts };
}

// ---------------------------------------------------------------------------
// Blocks (RF-61, RN-11)

export const blockSchema = z
	.object({
		userId: z.uuid(),
		target: z.enum(blockTarget.enumValues),
		productId: z.uuid().nullable().default(null),
		reason: body,
		nextStep: body,
		endsAt: z.coerce.date().nullable().default(null)
	})
	.refine((b) => (b.target === 'product') === (b.productId !== null), {
		message: 'a product block names the product, and only it does',
		path: ['productId']
	});

export async function createBlock(
	ctx: Ctx,
	supportId: string,
	input: z.input<typeof blockSchema>
): Promise<string> {
	const data = blockSchema.parse(input);
	return ctx.db.transaction(async (tx) => {
		const [row] = await translate(
			tx
				.insert(block)
				.values({ ...data, createdById: supportId })
				.returning({ id: block.id }),
			// The product must belong to the user (composite foreign key).
			[{ code: PG.FOREIGN_KEY, error: 'product_unavailable' }]
		);
		await audit(tx, supportId, 'block.create', { blockId: row!.id, ...data });
		return row!.id;
	});
}

export async function liftBlock(ctx: Ctx, supportId: string, blockId: string, now = new Date()) {
	const id = z.uuid().parse(blockId);
	await ctx.db.transaction(async (tx) => {
		const [lifted] = await tx
			.update(block)
			.set({ liftedAt: now, liftedById: supportId })
			.where(and(eq(block.id, id), isNull(block.liftedAt)))
			.returning({ id: block.id });
		assertFound(lifted, 'block');
		await audit(tx, supportId, 'block.lift', { blockId: id });
	});
}

/** RF-62: the audit trail, newest first. */
export async function listAudit(ctx: Ctx, viewer: SessionUser, limit = 100) {
	assertSupport(viewer);
	return ctx.db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			detail: auditLog.detail,
			createdAt: auditLog.createdAt,
			actorName: user.name
		})
		.from(auditLog)
		.innerJoin(user, eq(user.id, auditLog.actorId))
		.orderBy(desc(auditLog.createdAt))
		.limit(z.number().int().min(1).max(500).parse(limit));
}

// ---------------------------------------------------------------------------
// Tickets (RF-35)

export const ticketSchema = z.object({
	orderId: z.uuid(),
	subject: z.string().trim().min(1).max(200),
	body
});

/** A student opens a ticket on one of their orders, with the first message. */
export async function openTicket(
	ctx: Ctx,
	studentId: string,
	input: z.input<typeof ticketSchema>
): Promise<string> {
	const data = ticketSchema.parse(input);
	return ctx.db.transaction(async (tx) => {
		const [own] = await tx
			.select({ id: order.id })
			.from(order)
			.where(and(eq(order.id, data.orderId), eq(order.studentId, studentId)));
		assertFound(own, 'order');
		const [row] = await tx
			.insert(ticket)
			.values({ orderId: data.orderId, studentId, subject: data.subject })
			.returning({ id: ticket.id });
		await tx.insert(message).values({ ticketId: row!.id, authorId: studentId, body: data.body });
		return row!.id;
	});
}

/** The student of the ticket or support; anyone else gets NotFound. */
async function ticketFor(ctx: Ctx, viewer: SessionUser, ticketId: string) {
	// A malformed id is a missing ticket, never a validation error.
	if (!z.uuid().safeParse(ticketId).success) throw new NotFoundError('ticket not found');
	const [row] = await ctx.db.select().from(ticket).where(eq(ticket.id, ticketId));
	if (!row || (row.studentId !== viewer.id && viewer.platformRole !== 'support')) {
		throw new NotFoundError('ticket not found');
	}
	return row;
}

export async function getTicket(ctx: Ctx, viewer: SessionUser, ticketId: string) {
	const found = await ticketFor(ctx, viewer, ticketId);
	const [about] = await ctx.db
		.select({ studentName: user.name, productName: product.name })
		.from(order)
		.innerJoin(user, eq(user.id, order.studentId))
		.innerJoin(product, eq(product.id, order.productId))
		.where(eq(order.id, found.orderId));
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
		.where(eq(message.ticketId, found.id))
		.orderBy(asc(message.createdAt));
	return {
		ticket: found,
		student: { name: about!.studentName },
		product: { name: about!.productName },
		messages
	};
}

export async function listMyTickets(ctx: Ctx, studentId: string) {
	return ctx.db
		.select({
			id: ticket.id,
			orderId: ticket.orderId,
			studentId: ticket.studentId,
			subject: ticket.subject,
			status: ticket.status,
			createdAt: ticket.createdAt,
			closedAt: ticket.closedAt,
			productName: product.name
		})
		.from(ticket)
		.innerJoin(order, eq(order.id, ticket.orderId))
		.innerJoin(product, eq(product.id, order.productId))
		.where(eq(ticket.studentId, studentId))
		.orderBy(desc(ticket.createdAt));
}

/** A reply names its field, so the screen shows the error under it. */
const messageSchema = z.object({ body });

export async function addTicketMessage(
	ctx: Ctx,
	viewer: SessionUser,
	ticketId: string,
	text: string
) {
	const found = await ticketFor(ctx, viewer, ticketId);
	if (found.status !== 'open') {
		throw new DomainError('invalid_transition', 'a closed ticket takes no messages');
	}
	await ctx.db
		.insert(message)
		.values({ ticketId: found.id, authorId: viewer.id, ...messageSchema.parse({ body: text }) });
}

/** The student or support closes the ticket; support's close is audited. */
export async function closeTicket(
	ctx: Ctx,
	viewer: SessionUser,
	ticketId: string,
	now = new Date()
) {
	const found = await ticketFor(ctx, viewer, ticketId);
	await ctx.db.transaction(async (tx) => {
		assertTransition(TICKET_TRANSITIONS, found.status, 'closed');
		await tx
			.update(ticket)
			.set({ status: 'closed', closedAt: now })
			.where(and(eq(ticket.id, found.id), eq(ticket.status, 'open')));
		if (viewer.platformRole === 'support' && viewer.id !== found.studentId) {
			await audit(tx, viewer.id, 'ticket.close', { ticketId: found.id });
		}
	});
}

// ---------------------------------------------------------------------------
// Blocks and audit screens (RF-61, RF-62)

/**
 * The person support looks up by e-mail to block, with their products; null when no
 * account has that e-mail.
 */
export async function findBlockTarget(ctx: Ctx, viewer: SessionUser, email: string) {
	assertSupport(viewer);
	const [found] = await ctx.db
		.select({ id: user.id, name: user.name, email: user.email })
		.from(user)
		.where(eq(user.email, emailSchema.parse(email)));
	if (!found) return null;
	const products = await ctx.db
		.select({ id: product.id, name: product.name })
		.from(product)
		.where(eq(product.producerId, found.id))
		.orderBy(asc(product.name));
	return { ...found, products };
}

/** Every block in force (RN-11), across all people, newest first. */
export async function listActiveBlocks(ctx: Ctx, viewer: SessionUser, now = new Date()) {
	assertSupport(viewer);
	const creator = alias(user, 'creator');
	return ctx.db
		.select({
			id: block.id,
			target: block.target,
			reason: block.reason,
			nextStep: block.nextStep,
			endsAt: block.endsAt,
			createdAt: block.createdAt,
			userName: user.name,
			userEmail: user.email,
			productName: product.name,
			createdByName: creator.name
		})
		.from(block)
		.innerJoin(user, eq(user.id, block.userId))
		.innerJoin(creator, eq(creator.id, block.createdById))
		.leftJoin(product, eq(product.id, block.productId))
		.where(and(isNull(block.liftedAt), or(isNull(block.endsAt), gt(block.endsAt, now))))
		.orderBy(desc(block.createdAt));
}

/**
 * RF-62 for people: `listAudit` with the target of each record resolved to names (whose
 * balance, which refund) and the reason the record carries, if any.
 */
export async function listAuditTrail(ctx: Ctx, viewer: SessionUser, limit = 100) {
	const rows = await listAudit(ctx, viewer, limit);
	const ids = (key: string) => [
		...new Set(rows.map((r) => r.detail[key]).filter((v): v is string => typeof v === 'string'))
	];
	const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
	const blockIds = ids('blockId');
	const refundIds = ids('refundId');
	const payoutIds = ids('payoutId');
	const ticketIds = ids('ticketId');
	const [blocks, refunds, payouts, tickets] = await Promise.all([
		blockIds.length === 0
			? []
			: ctx.db
					.select({
						id: block.id,
						target: block.target,
						userName: user.name,
						productName: product.name
					})
					.from(block)
					.innerJoin(user, eq(user.id, block.userId))
					.leftJoin(product, eq(product.id, block.productId))
					.where(inArray(block.id, blockIds)),
		refundIds.length === 0
			? []
			: ctx.db
					.select({ id: refund.id, studentName: user.name, productName: product.name })
					.from(refund)
					.innerJoin(order, eq(order.id, refund.orderId))
					.innerJoin(product, eq(product.id, order.productId))
					.innerJoin(user, eq(user.id, order.studentId))
					.where(inArray(refund.id, refundIds)),
		payoutIds.length === 0
			? []
			: ctx.db
					.select({ id: payout.id, userName: user.name })
					.from(payout)
					.innerJoin(user, eq(user.id, payout.userId))
					.where(inArray(payout.id, payoutIds)),
		ticketIds.length === 0
			? []
			: ctx.db
					.select({ id: ticket.id, subject: ticket.subject, studentName: user.name })
					.from(ticket)
					.innerJoin(user, eq(user.id, ticket.studentId))
					.where(inArray(ticket.id, ticketIds))
	]);
	const found = {
		block: byId(blocks),
		refund: byId(refunds),
		payout: byId(payouts),
		ticket: byId(tickets)
	};

	function targetOf(detail: Record<string, unknown>): AuditTarget | null {
		const b = found.block.get(detail.blockId as string);
		if (b)
			return { kind: 'block', target: b.target, userName: b.userName, productName: b.productName };
		const r = found.refund.get(detail.refundId as string);
		if (r) return { kind: 'refund', studentName: r.studentName, productName: r.productName };
		const p = found.payout.get(detail.payoutId as string);
		if (p) return { kind: 'payout', userName: p.userName };
		const t = found.ticket.get(detail.ticketId as string);
		if (t) return { kind: 'ticket', studentName: t.studentName, subject: t.subject };
		return null;
	}

	return rows.map(({ detail, ...row }) => ({
		...row,
		target: targetOf(detail),
		reason: typeof detail.reason === 'string' ? detail.reason : null
	}));
}

// ---------------------------------------------------------------------------
// Lean Canvas & operational platform metrics (modelo-de-dados.md section 6)

const saoPauloParts = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/Sao_Paulo',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

function saoPauloCalendarDay(date: Date) {
	const parts = saoPauloParts.formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((p) => p.type === type)?.value ?? '';
	const year = part('year');
	const month = part('month');
	const day = part('day');
	return {
		key: `${year}-${month}-${day}`,
		label: `${day}/${month}`,
		year: Number(year),
		month: Number(month),
		day: Number(day)
	};
}

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Lean Canvas indicators (regras-de-negocio.md section 8, modelo-de-dados.md section 6)
 * alongside active paid-order totals (`order.status = 'paid'`), active blocks, and the
 * last 7 calendar days of paid orders in `America/Sao_Paulo`.
 */
export async function getPlatformMetrics(ctx: Ctx, viewer: SessionUser, now = new Date()) {
	assertSupport(viewer);

	const today = saoPauloCalendarDay(now);
	const buckets = Array.from({ length: 7 }, (_, idx) => {
		const offset = 6 - idx;
		const anchor = new Date(Date.UTC(today.year, today.month - 1, today.day - offset, 12, 0, 0));
		const d = saoPauloCalendarDay(anchor);
		return { key: d.key, label: d.label, count: 0, volumeCents: 0 };
	});
	const bucketByKey = new Map(buckets.map((b) => [b.key, b]));
	const windowStartBound = new Date(Date.UTC(today.year, today.month - 1, today.day - 7, 0, 0, 0));
	const windowEndBound = new Date(Date.UTC(today.year, today.month - 1, today.day + 2, 0, 0, 0));

	const [
		firstPublishes,
		productTotals,
		refundResponses,
		producerTicketRows,
		paidOrderTotals,
		activeBlocksRows,
		recentPaidOrders
	] = await Promise.all([
		ctx.db
			.select({
				userCreatedAt: user.createdAt,
				firstPublishedAt: min(product.publishedAt)
			})
			.from(product)
			.innerJoin(user, eq(user.id, product.producerId))
			.where(isNotNull(product.publishedAt))
			.groupBy(user.id, user.createdAt),
		ctx.db
			.select({
				totalProducts: sql<number>`count(*)::int`,
				publishedProducts: sql<number>`count(*) filter (where ${product.publishedAt} is not null)::int`
			})
			.from(product),
		ctx.db
			.select({
				openedAt: refund.openedAt,
				firstResponseAt: refund.firstResponseAt
			})
			.from(refund)
			.where(isNotNull(refund.firstResponseAt)),
		ctx.db
			.select({
				producerId: user.id,
				producerName: user.name,
				producerEmail: user.email,
				ticketCount: sql<number>`count(*)::int`,
				openTicketCount: sql<number>`count(*) filter (where ${ticket.status} = 'open')::int`
			})
			.from(ticket)
			.innerJoin(order, eq(order.id, ticket.orderId))
			.innerJoin(product, eq(product.id, order.productId))
			.innerJoin(user, eq(user.id, product.producerId))
			.groupBy(user.id, user.name, user.email)
			.orderBy(desc(sql`count(*)`), asc(user.name)),
		ctx.db
			.select({
				paidOrdersCount: sql<number>`count(*)::int`,
				grossVolumeCents: sql<string>`coalesce(sum(${order.grossCents}), 0)::bigint`,
				platformFeeCents: sql<string>`coalesce(sum(${order.feeCents}), 0)::bigint`
			})
			.from(order)
			.where(eq(order.status, 'paid')),
		ctx.db
			.select({ count: sql<number>`count(*)::int` })
			.from(block)
			.where(and(isNull(block.liftedAt), or(isNull(block.endsAt), gt(block.endsAt, now)))),
		ctx.db
			.select({
				paidAt: order.paidAt,
				grossCents: order.grossCents
			})
			.from(order)
			.where(
				and(
					eq(order.status, 'paid'),
					isNotNull(order.paidAt),
					gte(order.paidAt, windowStartBound),
					lte(order.paidAt, windowEndBound)
				)
			)
	]);

	const publishHours = firstPublishes
		.filter((row) => row.firstPublishedAt !== null)
		.map((row) =>
			Math.max(
				0,
				(new Date(row.firstPublishedAt!).getTime() - row.userCreatedAt.getTime()) / 3_600_000
			)
		);

	const responseHours = refundResponses.map((row) =>
		Math.max(0, (row.firstResponseAt!.getTime() - row.openedAt.getTime()) / 3_600_000)
	);

	const totalProducts = Number(productTotals[0]?.totalProducts ?? 0);
	const publishedProducts = Number(productTotals[0]?.publishedProducts ?? 0);
	const publishedRatePercent =
		totalProducts === 0 ? 0 : Math.round((publishedProducts / totalProducts) * 100);

	const ticketsByProducer = producerTicketRows
		.map((row) => ({
			producerId: row.producerId,
			producerName: row.producerName,
			producerEmail: row.producerEmail,
			ticketCount: Number(row.ticketCount),
			openTicketCount: Number(row.openTicketCount)
		}))
		.sort(
			(a, b) =>
				b.ticketCount - a.ticketCount || a.producerName.localeCompare(b.producerName, 'pt-BR')
		);

	for (const row of recentPaidOrders) {
		if (!row.paidAt) continue;
		const bucket = bucketByKey.get(saoPauloCalendarDay(row.paidAt).key);
		if (bucket) {
			bucket.count += 1;
			bucket.volumeCents += row.grossCents;
		}
	}

	return {
		medianHoursToFirstPublish: median(publishHours),
		conversion: {
			totalProducts,
			publishedProducts,
			publishedRatePercent
		},
		medianHoursToFirstRefundResponse: median(responseHours),
		ticketsByProducer,
		paidOrdersCount: Number(paidOrderTotals[0]?.paidOrdersCount ?? 0),
		grossVolumeCents: Number(paidOrderTotals[0]?.grossVolumeCents ?? 0),
		platformFeeCents: Number(paidOrderTotals[0]?.platformFeeCents ?? 0),
		activeBlocksCount: Number(activeBlocksRows[0]?.count ?? 0),
		dailyOrders: {
			labels: buckets.map((b) => b.label),
			counts: buckets.map((b) => b.count),
			volumeCents: buckets.map((b) => b.volumeCents)
		}
	};
}
