import { beforeEach, describe, expect, it } from 'vitest';
import { startCheckout } from './checkout';
import { inviteCoproducer } from './coproduction';
import { listProfiles } from './profiles';
import { newUser, publishedProduct, resetDb, testCtx, VALID_CPF } from './testing';

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
