import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { register } from '#lib/server/auth/accounts';
import { startSession } from '#lib/server/auth/login';
import { act } from '#lib/server/http';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, resolve('/'));
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = Object.fromEntries(await request.formData());
		const text = (key: string) => (typeof form[key] === 'string' ? form[key] : '');
		const values = { name: text('name'), email: text('email') };
		const result = await act(() => register(ctx, { ...values, password: text('password') }));
		// the typed values come back, so the form keeps them without JavaScript too
		if (!result.ok) return fail(result.status, { ...result.data, ...values });
		await startSession(ctx.db, cookies, result.value);
		redirect(303, resolve('/'));
	}
};
