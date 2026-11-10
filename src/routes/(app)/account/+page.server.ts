import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { SESSION_COOKIE, invalidateSession } from '#lib/server/auth/session';
import { db } from '#lib/server/db';
import { requireUser } from '#lib/server/http';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => ({ user: requireUser(locals) });

export const actions: Actions = {
	logout: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await invalidateSession(db, token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, resolve('/(public)/login'));
	}
};
