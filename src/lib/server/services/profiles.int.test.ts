import { beforeEach, describe, expect, it } from 'vitest';
import { startCheckout } from './checkout';
import { acceptInvite, inviteCoproducer } from './coproduction';
import { requestPayout } from './money';
import { homeProfile, listPendingCounts, listProfiles } from './profiles';
import { escalateOverdueRefunds, requestRefund } from './refunds';
import { openTicket } from './support';
import {
	buy,
	days,
	newUser,
	publishedProduct,
	releaseSalesOf,
	resetDb,
	testCtx,
	VALID_CPF
} from './testing';

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

describe('listPendingCounts', () => {
	it('returns zeros when nothing is waiting on the viewer', async () => {
		const ctx = testCtx();
		const user = await newUser('ana@example.com');
		expect(await listPendingCounts(ctx, user)).toEqual({
			producerRefunds: 0,
			coproducerInvites: 0,
			supportQueue: 0,
			supportPayouts: 0
		});
	});

	it('counts active producer refunds and pending coproducer invites', async () => {
		const ctx = testCtx();
		const now = new Date('2026-05-10T12:00:00Z');
		const producer = await newUser('p@example.com');
		const otherProducer = await newUser('other@example.com');
		const student = await newUser('bia@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const { productId: otherProductId } = await publishedProduct(ctx, otherProducer.id);

		const orderId = await buy(ctx, offerId, student.email, days(now, -10));
		await requestRefund(ctx, student.id, { orderId, reason: 'Não me adaptei.' }, now);

		const inviteId = await inviteCoproducer(
			ctx,
			otherProducer.id,
			{
				productId: otherProductId,
				email: producer.email,
				name: producer.name,
				percentBp: 2_000,
				durationDays: null
			},
			now
		);

		expect(await listPendingCounts(ctx, producer, now)).toEqual({
			producerRefunds: 1,
			coproducerInvites: 1,
			supportQueue: 0,
			supportPayouts: 0
		});

		// Past the producer deadline, the refund no longer counts as waiting on the producer;
		// accepting the invite clears the invite count too.
		await acceptInvite(ctx, producer.id, inviteId, now);
		expect(await listPendingCounts(ctx, producer, days(now, 4))).toEqual({
			producerRefunds: 0,
			coproducerInvites: 0,
			supportQueue: 0,
			supportPayouts: 0
		});
	});

	it('counts platform refunds, open tickets and requested payouts for support only', async () => {
		const ctx = testCtx();
		const now = new Date('2026-05-10T12:00:00Z');
		const producer = await newUser('p@example.com');
		const student = await newUser('bia@example.com');
		const support = await newUser('s@example.com', 'support');
		const { offerId } = await publishedProduct(ctx, producer.id, 20_000);

		const refundOrderId = await buy(ctx, offerId, student.email, days(now, -10));
		await requestRefund(ctx, student.id, { orderId: refundOrderId, reason: 'Motivo' }, now);
		await escalateOverdueRefunds(ctx, days(now, 4));

		const payoutOrderId = await buy(ctx, offerId, 'outro@example.com', days(now, -10));
		await openTicket(ctx, student.id, {
			orderId: refundOrderId,
			subject: 'Dúvida sobre o pedido',
			body: 'Preciso de ajuda.'
		});
		expect(payoutOrderId).toBeTruthy();

		await releaseSalesOf(producer.id);
		await requestPayout(ctx, producer.id, 5_000, days(now, 4));

		expect(await listPendingCounts(ctx, producer, days(now, 4))).toEqual({
			producerRefunds: 0,
			coproducerInvites: 0,
			supportQueue: 0,
			supportPayouts: 0
		});
		expect(await listPendingCounts(ctx, support, days(now, 4))).toEqual({
			producerRefunds: 0,
			coproducerInvites: 0,
			supportQueue: 2,
			supportPayouts: 1
		});
	});
});
