// Support (RF-35, RF-60 to RF-62). Every write by support is audited in its transaction.
// Refund and payout decisions live in refunds.ts and money.ts; they audit the same way.

import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { assertTransition, DomainError, TICKET_TRANSITIONS } from '../../domain/states';
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
		.select()
		.from(ticket)
		.where(eq(ticket.studentId, studentId))
		.orderBy(desc(ticket.createdAt));
}

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
		.values({ ticketId: found.id, authorId: viewer.id, body: body.parse(text) });
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
