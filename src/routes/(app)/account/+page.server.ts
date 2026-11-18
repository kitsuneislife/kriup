import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { dev } from '$app/env';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { closeAccount, THEME_COOKIE, updateUserName, type Theme } from '#lib/server/auth/accounts';
import { SESSION_COOKIE, invalidateSession } from '#lib/server/auth/session';
import { db } from '#lib/server/db';
import { act, formText, requireUser } from '#lib/server/http';
import type { Actions, PageServerLoad } from './$types';

const themeSchema = z.enum(['system', 'light', 'dark']);
const THEME_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const load: PageServerLoad = ({ locals, cookies, url }) => {
	const raw = cookies.get(THEME_COOKIE);
	const theme: Theme = raw === 'light' || raw === 'dark' ? raw : 'system';
	return {
		user: requireUser(locals),
		theme,
		closing: url.searchParams.get('close') === '1'
	};
};

export const actions: Actions = {
	theme: async ({ locals, request, cookies }) => {
		requireUser(locals);
		const choice = formText(await request.formData(), 'theme');
		const result = await act(async () => themeSchema.parse(choice));
		if (!result.ok) {
			return fail(result.status, { ...result.data, action: 'theme' as const });
		}
		if (result.value === 'system') {
			cookies.delete(THEME_COOKIE, { path: '/' });
		} else {
			cookies.set(THEME_COOKIE, result.value, {
				path: '/',
				sameSite: 'lax',
				secure: !dev,
				maxAge: THEME_MAX_AGE_SECONDS
			});
		}
		return { saved: 'theme' as const };
	},

	updateName: async ({ locals, request }) => {
		const current = requireUser(locals);
		const name = formText(await request.formData(), 'name');
		const result = await act(() => updateUserName(ctx, current.id, name));
		if (!result.ok) {
			return fail(result.status, { ...result.data, action: 'updateName' as const, name });
		}
		locals.user = { ...current, name: result.value };
		return { saved: 'name' as const };
	},

	closeAccount: async ({ locals, request, cookies }) => {
		const current = requireUser(locals);
		const password = formText(await request.formData(), 'password');
		const result = await act(() => closeAccount(ctx, current.id, password));
		if (!result.ok) {
			return fail(result.status, { ...result.data, action: 'closeAccount' as const });
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, resolve('/(public)/login'));
	},

	logout: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await invalidateSession(db, token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, resolve('/(public)/login'));
	}
};
