import { fail, redirect } from '@sveltejs/kit';
import { registerSchema } from '#lib/server/auth/credentials';
import { startSession } from '#lib/server/auth/login';
import { hashPassword } from '#lib/server/auth/password';
import { db } from '#lib/server/db';
import { user } from '#lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const UNIQUE_VIOLATION = '23505';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/account');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = Object.fromEntries(await request.formData());
		const values = {
			name: typeof form.name === 'string' ? form.name : '',
			email: typeof form.email === 'string' ? form.email : ''
		};
		const parsed = registerSchema.safeParse(form);
		if (!parsed.success) {
			return fail(400, {
				...values,
				error: 'Confira os campos: nome, e-mail válido e senha com 8 ou mais caracteres.'
			});
		}

		const { name, email, password } = parsed.data;
		let created: { id: string } | undefined;
		try {
			[created] = await db
				.insert(user)
				.values({ name, email, passwordHash: await hashPassword(password) })
				.returning({ id: user.id });
		} catch (err) {
			if (isUniqueViolation(err))
				return fail(400, { ...values, error: 'Este e-mail já está cadastrado.' });
			throw err;
		}
		if (!created) throw new Error('user insert returned no row');

		await startSession(db, cookies, created.id);
		redirect(303, '/account');
	}
};

function isUniqueViolation(err: unknown) {
	const e = err as { code?: string; cause?: { code?: string } };
	return e?.code === UNIQUE_VIOLATION || e?.cause?.code === UNIQUE_VIOLATION;
}
