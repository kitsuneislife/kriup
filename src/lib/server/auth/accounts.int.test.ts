import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
	coproduction,
	lesson,
	lessonProgress,
	passwordToken,
	product,
	session,
	user
} from '../db/schema';
import { inviteCoproducer } from '../services/coproduction';
import { completePayout, getBalance, requestPayout } from '../services/money';
import { requestRefund } from '../services/refunds';
import { createBlock, liftBlock } from '../services/support';
import {
	buy,
	days,
	db,
	newUser,
	publishedProduct,
	rejectsCode,
	releaseSalesOf,
	resetDb,
	testCtx
} from '../services/testing';
import { findOrCreateAccount } from '../users';
import { authenticate, closeAccount, register, safeNext, updateUserName } from './accounts';
import { createPasswordToken, RESET_TOKEN_TTL_MS } from './password-token';
import { createSession } from './session';

beforeEach(resetDb);
afterAll(resetDb);

const ana = { name: 'Ana Souza', email: 'Ana@Example.com', password: 'pão quentinho' };

describe('safeNext', () => {
	it('accepts safe internal paths and rejects external or auth-loop targets', () => {
		expect(safeNext('/producer/money')).toBe('/producer/money');
		expect(safeNext('/student/orders?page=2')).toBe('/student/orders?page=2');
		expect(safeNext('/')).toBe('/');

		for (const unsafe of [
			null,
			'',
			'producer',
			'//evil.example',
			'https://evil.example/path',
			'/login',
			'/login?next=/producer',
			'/register',
			'/password/forgot',
			'/producer\\evil',
			'/producer\nheader:1'
		]) {
			expect(safeNext(unsafe), String(unsafe)).toBeNull();
		}
	});
});

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

describe('updateUserName', () => {
	it('trims and updates the display name and refuses a blank one', async () => {
		const ctx = testCtx();
		const id = await register(ctx, ana);

		expect(await updateUserName(ctx, id, '  Ana Clara Souza  ')).toBe('Ana Clara Souza');
		const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, id));
		expect(row?.name).toBe('Ana Clara Souza');

		await expect(updateUserName(ctx, id, '   ')).rejects.toBeInstanceOf(ZodError);
	});
});

describe('closeAccount (RNF-06)', () => {
	it('deletes an account cleanly when it has no historical records', async () => {
		const ctx = testCtx();
		const id = await register(ctx, ana);
		const otherProducer = await newUser('prod@example.com');
		await publishedProduct(ctx, otherProducer.id);
		const [anyLesson] = await db.select({ id: lesson.id }).from(lesson).limit(1);

		await createSession(db, id);
		await createPasswordToken(db, id, RESET_TOKEN_TTL_MS);
		await db.insert(lessonProgress).values({ userId: id, lessonId: anyLesson!.id });

		expect(await closeAccount(ctx, id, ana.password)).toBe('deleted');

		expect(await db.select().from(user).where(eq(user.id, id))).toEqual([]);
		expect(await db.select().from(session).where(eq(session.userId, id))).toEqual([]);
		expect(await db.select().from(passwordToken).where(eq(passwordToken.userId, id))).toEqual([]);
		expect(await db.select().from(lessonProgress).where(eq(lessonProgress.userId, id))).toEqual([]);
	});

	it('anonymizes an account with history, unpublishes its products and cancels pending invites', async () => {
		const ctx = testCtx();
		const id = await register(ctx, ana);
		const support = await newUser('support@example.com', 'support');
		const { productId, offerId } = await publishedProduct(ctx, id, 10_000);

		const inviteId = await inviteCoproducer(ctx, id, {
			productId,
			email: 'co@example.com',
			name: 'Co',
			percentBp: 1_500,
			durationDays: null
		});

		await buy(ctx, offerId, 'student@example.com');
		await releaseSalesOf(id);
		const { releasedCents } = await getBalance(db, id);
		const payoutId = await requestPayout(ctx, id, releasedCents);
		await completePayout(ctx, support.id, payoutId);
		await createSession(db, id);

		expect(await closeAccount(ctx, id, ana.password)).toBe('anonymized');

		const [closed] = await db.select().from(user).where(eq(user.id, id));
		expect(closed?.name).toBe('Conta encerrada');
		expect(closed?.email).toBe(`deleted.${id}@deleted.invalid`);
		expect(closed?.passwordHash).toBeNull();

		const [prod] = await db.select().from(product).where(eq(product.id, productId));
		expect(prod?.status).toBe('draft');
		expect(prod?.publishedAt).toBeNull();

		const [inv] = await db.select().from(coproduction).where(eq(coproduction.id, inviteId));
		expect(inv?.status).toBe('canceled');
		expect(await db.select().from(session).where(eq(session.userId, id))).toEqual([]);

		// Old credentials stop working and the e-mail is freed for a new registration.
		await rejectsCode(
			authenticate(ctx, { email: 'ana@example.com', password: ana.password }),
			'invalid_credentials'
		);
		expect(await register(ctx, ana)).not.toBe(id);
	});

	it('refuses a wrong or missing password', async () => {
		const ctx = testCtx();
		const id = await register(ctx, ana);
		const passwordless = await findOrCreateAccount(db, 'buyer@example.com', 'Buyer');

		await rejectsCode(closeAccount(ctx, id, 'senha errada'), 'invalid_credentials');
		await rejectsCode(closeAccount(ctx, id, ''), 'invalid_credentials');
		await rejectsCode(closeAccount(ctx, passwordless.id, ana.password), 'invalid_credentials');

		const [stillThere] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
		expect(stillThere?.email).toBe('ana@example.com');
	});

	it('refuses closure while blocks, balances, payouts or refunds are open', async () => {
		const ctx = testCtx();
		const now = new Date('2026-06-01T12:00:00Z');
		const support = await newUser('support@example.com', 'support');

		// 1. Active block blocks closure until lifted
		const blockedId = await register(ctx, ana);
		const blockId = await createBlock(ctx, support.id, {
			userId: blockedId,
			target: 'account',
			productId: null,
			reason: 'Verificação cadastral',
			nextStep: 'Responda ao suporte',
			endsAt: null
		});
		await rejectsCode(
			closeAccount(ctx, blockedId, ana.password, now),
			'account_has_open_obligations'
		);
		await liftBlock(ctx, support.id, blockId, now);
		expect(await closeAccount(ctx, blockedId, ana.password, now)).toBe('anonymized');

		// 2. Held balance, released balance, requested payout, and open refund all block closure
		const producerId = await register(ctx, {
			name: 'Paulo',
			email: 'paulo@example.com',
			password: ana.password
		});
		const studentId = await register(ctx, {
			name: 'Bia',
			email: 'bia@example.com',
			password: ana.password
		});
		const { offerId } = await publishedProduct(ctx, producerId, 10_000);
		const orderId = await buy(ctx, offerId, 'bia@example.com', days(now, -10));

		// Held balance > 0 on producer
		await rejectsCode(
			closeAccount(ctx, producerId, ana.password, now),
			'account_has_open_obligations'
		);

		// Open refund blocks both student and producer
		await requestRefund(ctx, studentId, { orderId, reason: 'Motivo' }, now);
		await rejectsCode(
			closeAccount(ctx, studentId, ana.password, now),
			'account_has_open_obligations'
		);

		// Released balance and requested payout block closure too
		const payoutProducerId = await register(ctx, {
			name: 'Rita',
			email: 'rita@example.com',
			password: ana.password
		});
		const { offerId: ritaOfferId } = await publishedProduct(ctx, payoutProducerId, 10_000);
		await buy(ctx, ritaOfferId, 'outro@example.com', days(now, -10));
		await releaseSalesOf(payoutProducerId);
		await rejectsCode(
			closeAccount(ctx, payoutProducerId, ana.password, now),
			'account_has_open_obligations'
		);

		const { releasedCents } = await getBalance(db, payoutProducerId);
		await requestPayout(ctx, payoutProducerId, releasedCents, now);
		await rejectsCode(
			closeAccount(ctx, payoutProducerId, ana.password, now),
			'account_has_open_obligations'
		);
	});
});
