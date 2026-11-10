import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { Db } from '../db/client';
import { SESSION_COOKIE, createSession, sessionCookieOptions } from './session';

export async function startSession(db: Db, cookies: Cookies, userId: string) {
	const { token, expiresAt } = await createSession(db, userId);
	cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt, !dev));
}
