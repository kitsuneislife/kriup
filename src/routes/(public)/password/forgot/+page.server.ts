import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { ctx } from '#lib/server/app';
import { emailSchema } from '#lib/server/auth/credentials';
import { requestPasswordReset } from '#lib/server/auth/password-token';
import { act } from '#lib/server/http';
import type { Actions } from './$types';

const forgotSchema = z.object({ email: emailSchema });

export const actions: Actions = {
	default: async ({ request }) => {
		const raw = (await request.formData()).get('email');
		const email = typeof raw === 'string' ? raw : '';
		// a malformed e-mail is a typo to fix; whether the account exists is never told
		const result = await act(() => requestPasswordReset(ctx, forgotSchema.parse({ email }).email));
		if (!result.ok) return fail(result.status, { ...result.data, email });
		return { sent: true, email };
	}
};
