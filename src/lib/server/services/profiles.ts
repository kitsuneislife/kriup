// RF-04: one account, several roles. The navigation shows the areas of the roles a person has.

import { and, count, eq, gt } from 'drizzle-orm';
import type { SessionUser } from '../auth/session';
import type { Ctx } from '../context';
import { coproduction, order, payout, product, refund, ticket } from '../db/schema';

export type Profile = 'producer' | 'student' | 'coproducer' | 'support';

export interface PendingCounts {
	producerRefunds: number;
	coproducerInvites: number;
	supportQueue: number;
	supportPayouts: number;
}

/**
 * Producer always, student once there is an order (paid or not), coproducer once there is
 * an invite in any state, support only by platform role.
 */
export async function listProfiles(ctx: Ctx, viewer: SessionUser): Promise<Profile[]> {
	const [orders, invites] = await Promise.all([
		ctx.db.select({ id: order.id }).from(order).where(eq(order.studentId, viewer.id)).limit(1),
		ctx.db
			.select({ id: coproduction.id })
			.from(coproduction)
			.where(eq(coproduction.coproducerId, viewer.id))
			.limit(1)
	]);
	const profiles: Profile[] = ['producer'];
	if (orders.length > 0) profiles.push('student');
	if (invites.length > 0) profiles.push('coproducer');
	if (viewer.platformRole === 'support') profiles.push('support');
	return profiles;
}

/**
 * Actionable items waiting on the viewer across their sidebar areas, so pending work shows
 * a live badge without opening each screen first.
 */
export async function listPendingCounts(
	ctx: Ctx,
	viewer: SessionUser,
	now = new Date()
): Promise<PendingCounts> {
	const isSupport = viewer.platformRole === 'support';
	const [producerRefundRows, inviteRows, supportRefundRows, supportTicketRows, supportPayoutRows] =
		await Promise.all([
			ctx.db
				.select({ n: count() })
				.from(refund)
				.innerJoin(order, eq(order.id, refund.orderId))
				.innerJoin(product, eq(product.id, order.productId))
				.where(
					and(
						eq(product.producerId, viewer.id),
						eq(refund.status, 'with_producer'),
						gt(refund.dueAt, now)
					)
				),
			ctx.db
				.select({ n: count() })
				.from(coproduction)
				.where(and(eq(coproduction.coproducerId, viewer.id), eq(coproduction.status, 'invited'))),
			isSupport
				? ctx.db.select({ n: count() }).from(refund).where(eq(refund.status, 'with_platform'))
				: Promise.resolve([]),
			isSupport
				? ctx.db.select({ n: count() }).from(ticket).where(eq(ticket.status, 'open'))
				: Promise.resolve([]),
			isSupport
				? ctx.db.select({ n: count() }).from(payout).where(eq(payout.status, 'requested'))
				: Promise.resolve([])
		]);

	return {
		producerRefunds: producerRefundRows[0]?.n ?? 0,
		coproducerInvites: inviteRows[0]?.n ?? 0,
		supportQueue: isSupport ? (supportRefundRows[0]?.n ?? 0) + (supportTicketRows[0]?.n ?? 0) : 0,
		supportPayouts: isSupport ? (supportPayoutRows[0]?.n ?? 0) : 0
	};
}

/**
 * Where the person lands after signing in: support in the queue; someone who only bought
 * or was invited, and has no product of their own, in that area; everyone else in products.
 */
export async function homeProfile(ctx: Ctx, viewer: SessionUser): Promise<Profile> {
	const [profiles, owned] = await Promise.all([
		listProfiles(ctx, viewer),
		ctx.db
			.select({ id: product.id })
			.from(product)
			.where(eq(product.producerId, viewer.id))
			.limit(1)
	]);
	if (profiles.includes('support')) return 'support';
	if (owned.length > 0) return 'producer';
	if (profiles.includes('student')) return 'student';
	if (profiles.includes('coproducer')) return 'coproducer';
	return 'producer';
}
