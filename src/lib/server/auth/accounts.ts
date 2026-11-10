// Signing up and signing in with e-mail and password (RF-01, RF-02). Routes start the
// session; these only decide who the person is.

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { DomainError } from '../../domain/states';
import type { Ctx } from '../context';
import { user } from '../db/schema';
import { PG, translate } from '../errors';
import { loginSchema, registerSchema } from './credentials';
import { hashPassword, verifyPassword } from './password';

// Verified against when the e-mail is unknown, so response time does not reveal which e-mails exist.
const dummyHash = hashPassword('dummy-password-for-timing');

/**
 * Creates an account with a password and returns its id. An e-mail that already has an
 * account is taken even without a password (a buyer or an invitee): that person claims it
 * through the link in their e-mail, never by signing up again.
 */
export async function register(ctx: Ctx, input: z.input<typeof registerSchema>): Promise<string> {
	const { name, email, password } = registerSchema.parse(input);
	const [created] = await translate(
		ctx.db
			.insert(user)
			.values({ name, email, passwordHash: await hashPassword(password) })
			.returning({ id: user.id }),
		[{ code: PG.UNIQUE, error: 'email_taken' }]
	);
	if (!created) throw new Error('user insert returned no row');
	return created.id;
}

/** Returns the id of the account the e-mail and password belong to. */
export async function authenticate(ctx: Ctx, input: z.input<typeof loginSchema>): Promise<string> {
	const { email, password } = loginSchema.parse(input);
	const [found] = await ctx.db
		.select({ id: user.id, passwordHash: user.passwordHash })
		.from(user)
		.where(eq(user.email, email));
	const ok = await verifyPassword(found?.passwordHash ?? (await dummyHash), password);
	if (!found?.passwordHash || !ok) throw new DomainError('invalid_credentials');
	return found.id;
}
