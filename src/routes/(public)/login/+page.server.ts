import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { loginSchema } from '#lib/server/auth/credentials';
import { startSession } from '#lib/server/auth/login';
import { hashPassword, verifyPassword } from '#lib/server/auth/password';
import { db } from '#lib/server/db';
import { user } from '#lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

// Verified against when the email is unknown, so response time does not reveal which emails exist.
const dummyHash = hashPassword('dummy-password-for-timing');

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/account');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = Object.fromEntries(await request.formData());
		const parsed = loginSchema.safeParse(form);
		const email = typeof form.email === 'string' ? form.email : '';
		if (!parsed.success) return fail(400, { email, error: 'Informe e-mail e senha válidos.' });

		const [found] = await db.select().from(user).where(eq(user.email, parsed.data.email));
		const ok = await verifyPassword(found?.passwordHash ?? (await dummyHash), parsed.data.password);
		if (!found || !ok) return fail(400, { email, error: 'E-mail ou senha incorretos.' });

		await startSession(db, cookies, found.id);
		redirect(303, '/account');
	}
};
