// RF-04: one account, several roles. The navigation shows the areas of the roles a person has.

import { eq } from 'drizzle-orm';
import type { SessionUser } from '../auth/session';
import type { Ctx } from '../context';
import { coproduction, order, product } from '../db/schema';

export type Profile = 'producer' | 'student' | 'coproducer' | 'support';

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
