import { beforeEach, describe, expect, it } from 'vitest';
import { startCheckout } from './checkout';
import { inviteCoproducer } from './coproduction';
import { homeProfile, listProfiles } from './profiles';
import { buy, newUser, publishedProduct, resetDb, testCtx, VALID_CPF } from './testing';

beforeEach(resetDb);

describe('listProfiles (RF-04)', () => {
	it('gives every account the producer area', async () => {
		const ctx = testCtx();
		expect(await listProfiles(ctx, await newUser('ana@example.com'))).toEqual(['producer']);
	});

	it('adds the student area from the first order, even before it is paid', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const bia = await newUser('bia@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		await startCheckout(ctx, bia, {
			offerId,
			method: 'pix',
			name: 'Bia',
			email: bia.email,
			taxId: VALID_CPF
		});
		expect(await listProfiles(ctx, bia)).toEqual(['producer', 'student']);
		expect(await listProfiles(ctx, producer)).toEqual(['producer']);
	});

	it('adds the coproduction area from the invite, before it is accepted', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const co = await newUser('co@example.com');
		const { productId } = await publishedProduct(ctx, producer.id);
		await inviteCoproducer(ctx, producer.id, {
			productId,
			email: co.email,
			name: 'Co',
			percentBp: 1_000,
			durationDays: null
		});
		expect(await listProfiles(ctx, co)).toEqual(['producer', 'coproducer']);
	});

	it('adds the support area only by platform role', async () => {
		const ctx = testCtx();
		expect(await listProfiles(ctx, await newUser('s@example.com', 'support'))).toEqual([
			'producer',
			'support'
		]);
	});
});

describe('homeProfile', () => {
	it('opens products for a new account and for anyone who owns a product', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		expect(await homeProfile(ctx, producer)).toBe('producer');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const other = await newUser('o@example.com');
		await publishedProduct(ctx, other.id);
		await buy(ctx, offerId, other.email);
		expect(await homeProfile(ctx, other)).toBe('producer');
	});

	it('opens the courses of a buyer and the invites of an invitee', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { productId, offerId } = await publishedProduct(ctx, producer.id);
		const bia = await newUser('bia@example.com');
		await buy(ctx, offerId, bia.email);
		expect(await homeProfile(ctx, bia)).toBe('student');
		const co = await newUser('co@example.com');
		await inviteCoproducer(ctx, producer.id, {
			productId,
			email: co.email,
			name: 'Co',
			percentBp: 1_000,
			durationDays: null
		});
		expect(await homeProfile(ctx, co)).toBe('coproducer');
	});

	it('opens the queue for support', async () => {
		expect(await homeProfile(testCtx(), await newUser('s@example.com', 'support'))).toBe('support');
	});
});
