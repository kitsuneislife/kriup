import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { findOrCreateAccount } from '../users';
import { db, rejectsCode, resetDb, testCtx } from '../services/testing';
import { authenticate, register } from './accounts';

beforeEach(resetDb);
afterAll(resetDb);

const ana = { name: 'Ana Souza', email: 'Ana@Example.com', password: 'pão quentinho' };

describe('register (RF-01)', () => {
	it('creates an account that signs in with the lowercased e-mail', async () => {
		const ctx = testCtx();
		const id = await register(ctx, ana);
		expect(await authenticate(ctx, { email: 'ana@example.com', password: ana.password })).toBe(id);
	});

	it('refuses an e-mail that already has an account, with or without a password', async () => {
		const ctx = testCtx();
		await register(ctx, ana);
		await rejectsCode(register(ctx, { ...ana, name: 'Outra' }), 'email_taken');
		await findOrCreateAccount(db, 'buyer@example.com', 'Buyer');
		await rejectsCode(register(ctx, { ...ana, email: 'buyer@example.com' }), 'email_taken');
	});

	it('refuses a short password as invalid input', async () => {
		await expect(register(testCtx(), { ...ana, password: '1234567' })).rejects.toBeInstanceOf(
			ZodError
		);
	});
});

describe('authenticate (RF-02)', () => {
	it('answers the same for a wrong password, an unknown e-mail and an account without one', async () => {
		const ctx = testCtx();
		await register(ctx, ana);
		await findOrCreateAccount(db, 'buyer@example.com', 'Buyer');
		for (const input of [
			{ email: ana.email, password: 'senha errada' },
			{ email: 'nobody@example.com', password: ana.password },
			{ email: 'buyer@example.com', password: ana.password }
		]) {
			await rejectsCode(authenticate(ctx, input), 'invalid_credentials');
		}
	});
});
