import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { authenticate } from '#lib/server/auth/accounts';
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
		const email = text('email');
		const result = await act(() => authenticate(ctx, { email, password: text('password') }));
		// the typed e-mail comes back, so the form keeps it without JavaScript too
		if (!result.ok) return fail(result.status, { ...result.data, email });
		await startSession(ctx.db, cookies, result.value);
		redirect(303, resolve('/'));
	}
};
