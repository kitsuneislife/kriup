import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { DomainError } from '../../domain/states';
import type { Db, Tx } from '../db/client';
import { auditLog, block, user } from '../db/schema';
import { NotFoundError } from '../errors';

export type BlockTarget = (typeof block.target.enumValues)[number];

/** Blocks in force for a user (RN-11): not lifted and not past their end. */
export async function activeBlocks(db: Db | Tx, userId: string, now = new Date()) {
	return db
		.select({
			id: block.id,
			target: block.target,
			productId: block.productId,
			reason: block.reason,
			nextStep: block.nextStep,
			endsAt: block.endsAt,
			createdAt: block.createdAt
		})
		.from(block)
		.where(
			and(
				eq(block.userId, userId),
				isNull(block.liftedAt),
				or(isNull(block.endsAt), gt(block.endsAt, now))
			)
		);
}

/**
 * Refuses the action when an account block, or a block on one of `targets`, is in force.
 * A product block counts only for `productId`. The reason and next step go with the
 * error, so the screen can show them (RF-45).
 */
export async function assertNotBlocked(
	db: Db | Tx,
	userId: string,
	targets: readonly Exclude<BlockTarget, 'account'>[],
	productId: string | null,
	now = new Date()
) {
	const hit = (await activeBlocks(db, userId, now)).find(
		(b) =>
			b.target === 'account' ||
			(b.target === 'balance' && targets.includes('balance')) ||
			(b.target === 'product' && targets.includes('product') && b.productId === productId)
	);
	if (hit) throw new DomainError('blocked', `${hit.target} blocked: ${hit.reason}`);
}

/**
 * RF-62: every support action leaves a record, in the transaction of the action. It also
 * checks the actor is support, so a support action can never commit without both.
 */
export async function audit(
	tx: Tx,
	actorId: string,
	action: string,
	detail: Record<string, unknown>
) {
	const [actor] = await tx
		.select({ role: user.platformRole })
		.from(user)
		.where(eq(user.id, actorId));
	if (actor?.role !== 'support') throw new NotFoundError(`${action} not found`);
	await tx.insert(auditLog).values({ actorId, action, detail });
}

/** Support screens answer NotFound to anyone else (RNF-05). */
export function assertSupport(viewer: { platformRole: string }) {
	if (viewer.platformRole !== 'support') throw new NotFoundError('page not found');
}
