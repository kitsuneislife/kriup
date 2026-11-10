import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { startSession } from '#lib/server/auth/login';
import { passwordTokenOwner, setPasswordWithToken } from '#lib/server/auth/password-token';
import { act } from '#lib/server/http';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	// the token is in the address: no copy in caches, none sent along as referrer
	setHeaders({ 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
	return { owner: await passwordTokenOwner(ctx, params.token) };
};

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const password = (await request.formData()).get('password');
		const result = await act(() =>
			setPasswordWithToken(ctx, {
				token: params.token,
				password: typeof password === 'string' ? password : ''
			})
		);
		if (!result.ok) return fail(result.status, result.data);
		await startSession(ctx.db, cookies, result.value);
		redirect(303, resolve('/'));
	}
};
