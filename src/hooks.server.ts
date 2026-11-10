import type { Handle } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { SESSION_COOKIE, sessionCookieOptions, validateSession } from '#lib/server/auth/session';
import { db } from '#lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = null;

	if (token) {
		const result = await validateSession(db, token);
		if (result) {
			event.locals.user = result.user;
			event.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(result.expiresAt, !dev));
		} else {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}
	return resolve(event);
};
