import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../domain/states';
import { type Ctx, link, sendAfterCommit } from '../context';
import type { Db, Tx } from '../db/client';
import { passwordToken, session, user } from '../db/schema';
import { emailSchema, passwordSchema } from './credentials';
import { hashPassword } from './password';

/** First access after a purchase or an invite (RF-03): long enough to read the e-mail. */
export const ACCESS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Recovery (RF-02): short, since whoever reads the inbox can take the account. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Stores only the hash and returns the raw token for the link. */
export async function createPasswordToken(
	db: Db | Tx,
	userId: string,
	ttlMs: number,
	now = new Date()
) {
	const token = randomBytes(32).toString('base64url');
	await db
		.insert(passwordToken)
		.values({ id: hashToken(token), userId, expiresAt: new Date(now.getTime() + ttlMs) });
	return token;
}

export const setPasswordLink = (ctx: Ctx, token: string) => link(ctx, `/password/${token}`);

const setPasswordInput = z.object({ token: z.string().min(1), password: passwordSchema });

/**
 * Sets the password from a link (RF-02, RF-03). The token is single use: every token and
 * session of the user is dropped, so an old link or a stolen session stops working.
 * Returns the user id so the caller can start a session.
 */
export async function setPasswordWithToken(
	ctx: Ctx,
	input: z.input<typeof setPasswordInput>,
	now = new Date()
): Promise<string> {
	const { token, password } = setPasswordInput.parse(input);
	const passwordHash = await hashPassword(password);
	return ctx.db.transaction(async (tx) => {
		const [row] = await tx
			.delete(passwordToken)
			.where(and(eq(passwordToken.id, hashToken(token)), gt(passwordToken.expiresAt, now)))
			.returning({ userId: passwordToken.userId });
		if (!row) throw new DomainError('invalid_token', 'password link is invalid or expired');
		await tx.update(user).set({ passwordHash }).where(eq(user.id, row.userId));
		await tx.delete(passwordToken).where(eq(passwordToken.userId, row.userId));
		await tx.delete(session).where(eq(session.userId, row.userId));
		return row.userId;
	});
}

/** RF-02. Answers the same whether the e-mail exists or not, so accounts cannot be probed. */
export async function requestPasswordReset(ctx: Ctx, rawEmail: string, now = new Date()) {
	const parsed = emailSchema.safeParse(rawEmail);
	if (!parsed.success) return;
	const [found] = await ctx.db
		.select({ id: user.id, name: user.name, email: user.email })
		.from(user)
		.where(eq(user.email, parsed.data));
	if (!found) return;
	const token = await createPasswordToken(ctx.db, found.id, RESET_TOKEN_TTL_MS, now);
	await sendAfterCommit(ctx, {
		to: found.email,
		subject: 'Defina uma nova senha',
		text: `Olá, ${found.name}.\n\nPara definir uma nova senha, abra o link abaixo. Ele vale por 1 hora e só pode ser usado uma vez.\n\n${setPasswordLink(ctx, token)}\n\nSe você não pediu, ignore este e-mail.`
	});
}
