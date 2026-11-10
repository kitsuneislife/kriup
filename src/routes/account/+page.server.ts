import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, invalidateSession } from '#lib/server/auth/session';
import { db } from '#lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	return { user: locals.user };
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await invalidateSession(db, token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
