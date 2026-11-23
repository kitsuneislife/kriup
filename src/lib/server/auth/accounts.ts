// Signing up, signing in, profile updates and LGPD account closure (RF-01, RF-02, RNF-06).
// Routes manage the session cookie; these services own the account rules.

import { and, eq, inArray, or } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../domain/states';
import type { Ctx } from '../context';
import {
	auditLog,
	block,
	coproduction,
	ledgerEntry,
	lessonProgress,
	message,
	order,
	passwordToken,
	payout,
	product,
	refund,
	session,
	ticket,
	user
} from '../db/schema';
import { assertFound, PG, translate } from '../errors';
import { activeBlocks } from '../services/blocks';
import { getBalance } from '../services/money';
import { loginSchema, nameSchema, registerSchema } from './credentials';
import { hashPassword, verifyPassword } from './password';

export const THEME_COOKIE = 'kriup_theme';
export type Theme = 'system' | 'light' | 'dark';

// Verified against when the e-mail is unknown, so response time does not reveal which e-mails exist.
const dummyHash = hashPassword('dummy-password-for-timing');

/**
 * Validates a post-login `next` path so an attacker can never bounce a user off-site or
 * back into an auth loop.
 */
export function safeNext(raw: string | null): string | null {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
	for (let i = 0; i < raw.length; i++) {
		const code = raw.charCodeAt(i);
		if (code <= 0x1f || code === 0x7f || code === 0x5c) return null;
	}
	if (raw.startsWith('/login') || raw.startsWith('/register') || raw.startsWith('/password')) {
		return null;
	}
	return raw;
}

/**
 * Creates an account with a password and returns its id. An e-mail that already has an
 * account is taken even without a password (a buyer or an invitee): that person claims it
 * through the link in their e-mail, never by signing up again.
 */
export async function register(ctx: Ctx, input: z.input<typeof registerSchema>): Promise<string> {
	const { name, email, password } = registerSchema.parse(input);
	const [created] = await translate(
		ctx.db
			.insert(user)
			.values({ name, email, passwordHash: await hashPassword(password) })
			.returning({ id: user.id }),
		[{ code: PG.UNIQUE, error: 'email_taken' }]
	);
	if (!created) throw new Error('user insert returned no row');
	return created.id;
}

/** Returns the id of the account the e-mail and password belong to. */
export async function authenticate(ctx: Ctx, input: z.input<typeof loginSchema>): Promise<string> {
	const { email, password } = loginSchema.parse(input);
	const [found] = await ctx.db
		.select({ id: user.id, passwordHash: user.passwordHash })
		.from(user)
		.where(eq(user.email, email));
	const ok = await verifyPassword(found?.passwordHash ?? (await dummyHash), password);
	if (!found?.passwordHash || !ok) throw new DomainError('invalid_credentials');
	return found.id;
}

const updateNameSchema = z.object({ name: nameSchema });

/** Updates the person's display name and returns the trimmed value. */
export async function updateUserName(ctx: Ctx, userId: string, name: string): Promise<string> {
	const { name: trimmed } = updateNameSchema.parse({ name });
	const [updated] = await ctx.db
		.update(user)
		.set({ name: trimmed })
		.where(eq(user.id, userId))
		.returning({ name: user.name });
	return assertFound(updated, 'user').name;
}

/**
 * RNF-06 (LGPD): closes the account once there are no open obligations. An account with no
 * fiscal, commercial or support history is deleted outright; otherwise its personal data is
 * anonymized so immutable ledger, contract and audit records remain valid.
 */
export async function closeAccount(
	ctx: Ctx,
	userId: string,
	password: string,
	now = new Date()
): Promise<'deleted' | 'anonymized'> {
	return ctx.db.transaction(async (tx) => {
		const [row] = await tx
			.select({ id: user.id, passwordHash: user.passwordHash })
			.from(user)
			.where(eq(user.id, userId))
			.for('update');
		const found = assertFound(row, 'user');

		const ok = await verifyPassword(found.passwordHash ?? (await dummyHash), password);
		if (!found.passwordHash || !ok || password.length === 0) {
			throw new DomainError('invalid_credentials');
		}

		const [blocks, openPayouts, openRefunds, balance] = await Promise.all([
			activeBlocks(tx, userId, now),
			tx
				.select({ id: payout.id })
				.from(payout)
				.where(and(eq(payout.userId, userId), eq(payout.status, 'requested')))
				.limit(1),
			tx
				.select({ id: refund.id })
				.from(refund)
				.innerJoin(order, eq(order.id, refund.orderId))
				.innerJoin(product, eq(product.id, order.productId))
				.where(
					and(
						inArray(refund.status, ['with_producer', 'with_platform', 'approved']),
						or(eq(order.studentId, userId), eq(product.producerId, userId))
					)
				)
				.limit(1),
			getBalance(tx, userId)
		]);

		if (
			blocks.length > 0 ||
			openPayouts.length > 0 ||
			openRefunds.length > 0 ||
			balance.heldCents !== 0 ||
			balance.releasedCents !== 0
		) {
			throw new DomainError('account_has_open_obligations');
		}

		const ownedProducts = await tx
			.select({ id: product.id })
			.from(product)
			.where(eq(product.producerId, userId));

		if (ownedProducts.length > 0) {
			await tx
				.update(product)
				.set({ status: 'draft', publishedAt: null })
				.where(and(eq(product.producerId, userId), eq(product.status, 'published')));
		}

		const ownedIds = ownedProducts.map((p) => p.id);
		await tx
			.update(coproduction)
			.set({ status: 'canceled' })
			.where(
				and(
					eq(coproduction.status, 'invited'),
					ownedIds.length > 0
						? or(eq(coproduction.coproducerId, userId), inArray(coproduction.productId, ownedIds))
						: eq(coproduction.coproducerId, userId)
				)
			);

		await tx.delete(session).where(eq(session.userId, userId));
		await tx.delete(passwordToken).where(eq(passwordToken.userId, userId));
		await tx.delete(lessonProgress).where(eq(lessonProgress.userId, userId));

		const history = await Promise.all([
			tx.select({ id: order.id }).from(order).where(eq(order.studentId, userId)).limit(1),
			tx
				.select({ id: ledgerEntry.id })
				.from(ledgerEntry)
				.where(eq(ledgerEntry.userId, userId))
				.limit(1),
			tx.select({ id: payout.id }).from(payout).where(eq(payout.userId, userId)).limit(1),
			tx
				.select({ id: coproduction.id })
				.from(coproduction)
				.where(eq(coproduction.coproducerId, userId))
				.limit(1),
			Promise.resolve(ownedProducts),
			tx
				.select({ id: block.id })
				.from(block)
				.where(
					or(eq(block.userId, userId), eq(block.createdById, userId), eq(block.liftedById, userId))
				)
				.limit(1),
			tx.select({ id: auditLog.id }).from(auditLog).where(eq(auditLog.actorId, userId)).limit(1),
			tx.select({ id: message.id }).from(message).where(eq(message.authorId, userId)).limit(1),
			tx.select({ id: ticket.id }).from(ticket).where(eq(ticket.studentId, userId)).limit(1)
		]);

		const hasHistory = history.some((rows) => rows.length > 0);
		if (!hasHistory) {
			await tx.delete(user).where(eq(user.id, userId));
			return 'deleted';
		}

		await tx
			.update(user)
			.set({
				name: 'Conta encerrada',
				email: `deleted.${userId.toLowerCase()}@deleted.invalid`,
				passwordHash: null
			})
			.where(eq(user.id, userId));
		return 'anonymized';
	});
}
