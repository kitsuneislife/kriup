import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { PAYOUT_FEE_CENTS } from '../../domain/params';
import { DomainError } from '../../domain/states';
import { platformFee, splitSale } from '../../domain/split';
import { ledgerEntry, payout, user } from '../db/schema';
import { NotFoundError } from '../errors';
import { acceptInvite, inviteCoproducer } from './coproduction';
import {
	completePayout,
	declinePayout,
	getBalance,
	getMoneyPanel,
	getStatement,
	releaseHeld,
	requestPayout
} from './money';
import { createBlock } from './support';
import { buy, days, db, newUser, publishedProduct, rejectsCode, resetDb, testCtx } from './testing';

beforeEach(resetDb);

const PAID = new Date('2026-11-01T12:00:00Z');
const NET = splitSale(10_000, platformFee(10_000)).producerCents;

/** A producer with one sale of R$ 100 already released. */
async function released() {
	const ctx = testCtx();
	const producer = await newUser('p@example.com');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	await buy(ctx, offerId, 'a@example.com', PAID);
	return { ctx, producer, productId, offerId };
}

describe('release (RN-04)', () => {
	it('moves held sales to released at the end of the guarantee, once', async () => {
		const { ctx, producer } = await released();
		expect(await releaseHeld(ctx, days(PAID, 6.9))).toBe(0);
		const panel = await getMoneyPanel(ctx, producer.id);
		expect(panel.balance.heldCents).toBe(NET);
		expect(panel.releases).toEqual([{ releaseAt: days(PAID, 7), amountCents: NET, entries: 1 }]);

		expect(await releaseHeld(ctx, days(PAID, 7))).toBe(1);
		expect(await releaseHeld(ctx, days(PAID, 8))).toBe(0);
		expect(await getBalance(db, producer.id)).toEqual({
			heldCents: 0,
			releasedCents: NET,
			paidOutCents: 0
		});
	});
});

describe('payout (RN-13)', () => {
	it('refuses below the minimum and above the released balance', async () => {
		const { ctx, producer } = await released();
		await rejectsCode(requestPayout(ctx, producer.id, 5_000), 'insufficient_balance');
		await releaseHeld(ctx, days(PAID, 7));
		await rejectsCode(requestPayout(ctx, producer.id, 4_999), 'below_minimum');
		await rejectsCode(requestPayout(ctx, producer.id, NET + 1), 'insufficient_balance');
	});

	it('takes the amount at request and pays the amount minus the fee', async () => {
		const { ctx, producer } = await released();
		const support = await newUser('s@example.com', 'support');
		await releaseHeld(ctx, days(PAID, 7));
		const id = await requestPayout(ctx, producer.id, 6_000);
		expect(await getBalance(db, producer.id)).toEqual({
			heldCents: 0,
			releasedCents: NET - 6_000,
			paidOutCents: 0
		});
		await completePayout(ctx, support.id, id);
		await rejectsCode(completePayout(ctx, support.id, id), 'invalid_transition');
		expect(await getBalance(db, producer.id)).toEqual({
			heldCents: 0,
			releasedCents: NET - 6_000,
			paidOutCents: 6_000 - PAYOUT_FEE_CENTS
		});
	});

	it('gives the money back when support declines', async () => {
		const { ctx, producer } = await released();
		const support = await newUser('s@example.com', 'support');
		await releaseHeld(ctx, days(PAID, 7));
		const id = await requestPayout(ctx, producer.id, 6_000);
		await declinePayout(ctx, support.id, id, 'Conta bancária inválida');
		expect((await getBalance(db, producer.id)).releasedCents).toBe(NET);
		const [p] = await db.select().from(payout).where(eq(payout.id, id));
		expect(p!.status).toBe('declined');
	});

	it('never lets two simultaneous requests spend the same money', async () => {
		const { ctx, producer } = await released();
		await releaseHeld(ctx, days(PAID, 7));
		const results = await Promise.allSettled([
			requestPayout(ctx, producer.id, 6_000),
			requestPayout(ctx, producer.id, 6_000)
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
		expect((rejected.reason as DomainError).code).toBe('insufficient_balance');
		expect((await getBalance(db, producer.id)).releasedCents).toBe(NET - 6_000);
	});

	it('refuses under a balance block and shows it on the panel (RF-45)', async () => {
		const { ctx, producer } = await released();
		const support = await newUser('s@example.com', 'support');
		await releaseHeld(ctx, days(PAID, 7));
		await createBlock(ctx, support.id, {
			userId: producer.id,
			target: 'balance',
			reason: 'Chargeback em análise',
			nextStep: 'Envie o comprovante de entrega'
		});
		await rejectsCode(requestPayout(ctx, producer.id, 6_000), 'blocked');
		expect((await getMoneyPanel(ctx, producer.id)).blocks).toMatchObject([
			{ target: 'balance', nextStep: 'Envie o comprovante de entrega' }
		]);
	});

	it('lets only support decide a payout', async () => {
		const { ctx, producer } = await released();
		await releaseHeld(ctx, days(PAID, 7));
		const id = await requestPayout(ctx, producer.id, 6_000);
		await expect(completePayout(ctx, producer.id, id)).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe('statement (RF-43, RF-53, US-04)', () => {
	it('filters by state and shows the coproducer the rule and the producer part', async () => {
		const { ctx, producer, productId, offerId } = await released();
		const invite = await inviteCoproducer(ctx, producer.id, {
			productId,
			email: 'co@example.com',
			name: 'Co',
			percentBp: 2_000,
			durationDays: null
		});
		const [co] = await db.select().from(user).where(eq(user.email, 'co@example.com'));
		await acceptInvite(ctx, co!.id, invite, days(PAID, 1));
		await buy(ctx, offerId, 'b@example.com', days(PAID, 2));
		await releaseHeld(ctx, days(PAID, 7));

		const mine = await getStatement(ctx, co!.id);
		const parts = splitSale(10_000, platformFee(10_000), [2_000]);
		expect(mine.entries).toMatchObject([
			{
				grossCents: 10_000,
				feeCents: platformFee(10_000),
				percentBp: 2_000,
				amountCents: parts.coproducerCents[0],
				producerCents: parts.producerCents
			}
		]);
		expect((await getStatement(ctx, producer.id, { state: 'released' })).entries).toHaveLength(1);
		expect((await getStatement(ctx, producer.id, { state: 'held' })).entries).toHaveLength(1);
		const paged = await getStatement(ctx, producer.id, { pageSize: 1 });
		expect(paged).toMatchObject({ hasMore: true });
		expect(await db.select().from(ledgerEntry)).toHaveLength(3);
	});
});
