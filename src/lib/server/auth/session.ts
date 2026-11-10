import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { session, user } from '../db/schema';

export const SESSION_COOKIE = 'session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_WHEN_LEFT_MS = SESSION_TTL_MS / 2;

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	platformRole: 'user' | 'support';
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Creates a session and returns the raw token to put in the cookie. */
export async function createSession(db: Db, userId: string, now = new Date()) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
	await db.insert(session).values({ id: hashToken(token), userId, expiresAt });
	return { token, expiresAt };
}

/** Returns the user for a valid token, or null. Expired sessions are deleted; live ones are renewed. */
export async function validateSession(db: Db, token: string, now = new Date()) {
	const id = hashToken(token);
	const [row] = await db
		.select({
			expiresAt: session.expiresAt,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				platformRole: user.platformRole
			}
		})
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, id));
	if (!row) return null;

	if (row.expiresAt.getTime() <= now.getTime()) {
		await db.delete(session).where(eq(session.id, id));
		return null;
	}

	let expiresAt = row.expiresAt;
	if (expiresAt.getTime() - now.getTime() < RENEW_WHEN_LEFT_MS) {
		expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
		await db.update(session).set({ expiresAt }).where(eq(session.id, id));
	}
	return { user: row.user, expiresAt };
}

export async function invalidateSession(db: Db, token: string) {
	await db.delete(session).where(eq(session.id, hashToken(token)));
}

export function sessionCookieOptions(expiresAt: Date, secure: boolean) {
	return { path: '/', httpOnly: true, sameSite: 'lax', secure, expires: expiresAt } as const;
}
