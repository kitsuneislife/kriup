import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { PAYOUT_FEE_CENTS } from '../../domain/params';
import { DomainError } from '../../domain/states';
import { platformFee, splitSale } from '../../domain/split';
import { ZodError } from 'zod';
import { ledgerEntry, order, payout, user } from '../db/schema';
import { NotFoundError } from '../errors';
import { acceptInvite, inviteCoproducer } from './coproduction';
import {
	completePayout,
	declinePayout,
	getBalance,
	getMoneyPanel,
	getStatement,
	listPayouts,
	listPendingPayouts,
	listStatementProducts,
	releaseHeld,
	requestPayout,
	statementSchema
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
		expect((await listPayouts(ctx, producer.id))[0]).toMatchObject({
			status: 'declined',
			declineReason: 'Conta bancária inválida'
		});
	});

	it('refuses a blank decline reason on the reason field', async () => {
		const { ctx, producer } = await released();
		const support = await newUser('s@example.com', 'support');
		await releaseHeld(ctx, days(PAID, 7));
		const id = await requestPayout(ctx, producer.id, 6_000);
		const err = await declinePayout(ctx, support.id, id, '   ').catch((e: unknown) => e);
		expect(err).toBeInstanceOf(ZodError);
		expect((err as ZodError).issues[0]!.path).toEqual(['reason']);
		expect((await listPayouts(ctx, producer.id))[0]!.status).toBe('requested');
	});

	it('lists every pending payout to support only, oldest first', async () => {
		const { ctx, producer, offerId: own } = await released();
		const support = await newUser('s@example.com', 'support');
		await buy(ctx, own, 'c@example.com', PAID);
		await releaseHeld(ctx, days(PAID, 7));
		const first = await requestPayout(ctx, producer.id, 5_000);
		const second = await requestPayout(ctx, producer.id, 5_000);
		await db
			.update(payout)
			.set({ createdAt: new Date('2026-11-10T12:00:00Z') })
			.where(eq(payout.id, second));
		// a second producer, so the list crosses users
		const otherProducer = await newUser('p2@example.com');
		const { offerId } = await publishedProduct(ctx, otherProducer.id);
		await buy(ctx, offerId, 'b@example.com', PAID);
		await releaseHeld(ctx, days(PAID, 7));
		const third = await requestPayout(ctx, otherProducer.id, 6_000);

		const pending = await listPendingPayouts(ctx, support);
		// the older request comes first, whatever the insertion order
		expect(pending.map((p) => p.id)).toEqual([second, first, third]);
		expect(pending[2]).toMatchObject({
			amountCents: 6_000,
			feeCents: PAYOUT_FEE_CENTS,
			userName: otherProducer.name,
			userEmail: 'p2@example.com'
		});

		await completePayout(ctx, support.id, first);
		await declinePayout(ctx, support.id, second, 'Conta bancária inválida');
		expect((await listPendingPayouts(ctx, support)).map((p) => p.id)).toEqual([third]);
		await expect(listPendingPayouts(ctx, producer)).rejects.toBeInstanceOf(NotFoundError);
	});

	it('answers a malformed payout id as not found', async () => {
		const ctx = testCtx();
		const support = await newUser('s@example.com', 'support');
		await expect(completePayout(ctx, support.id, 'nope')).rejects.toBeInstanceOf(NotFoundError);
		await expect(declinePayout(ctx, support.id, 'nope', 'Motivo')).rejects.toBeInstanceOf(
			NotFoundError
		);
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

describe('recent sales (RF-41)', () => {
	async function insertSale(
		userId: string,
		productId: string,
		offerId: string,
		studentId: string,
		amountCents: number,
		createdAt: Date,
		state: 'held' | 'released' | 'reversed' = 'held'
	) {
		const [createdOrder] = await db
			.insert(order)
			.values({
				offerId,
				productId,
				studentId,
				paymentMethod: 'pix',
				grossCents: 10_000,
				feeCents: platformFee(10_000),
				guaranteeDays: 7,
				status: state === 'reversed' ? 'refunded' : 'paid',
				paidAt: createdAt,
				createdAt
			})
			.returning({ id: order.id });
		const [entry] = await db
			.insert(ledgerEntry)
			.values({
				userId,
				orderId: createdOrder!.id,
				type: 'sale',
				state: 'held',
				amountCents,
				reason: 'Venda de Curso de pão, retida até o fim da garantia',
				releaseAt: days(createdAt, 7),
				createdAt
			})
			.returning({ id: ledgerEntry.id });
		if (state !== 'held') {
			await db.update(ledgerEntry).set({ state }).where(eq(ledgerEntry.id, entry!.id));
		}
	}

	it('groups the last 7 Sao Paulo calendar days, excluding reversed and foreign sales', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const other = await newUser('other@example.com');
		const student = await newUser('student@example.com');
		const { productId, offerId } = await publishedProduct(ctx, producer.id);
		const otherPub = await publishedProduct(ctx, other.id);

		// 2026-11-18T01:30:00Z is 2026-11-17 22:30 in America/Sao_Paulo (UTC-3): window 11/11..17/11
		const now = new Date('2026-11-18T01:30:00Z');
		const empty = await getMoneyPanel(ctx, producer.id, now);
		expect(empty.recentSales).toEqual({
			labels: ['11/11', '12/11', '13/11', '14/11', '15/11', '16/11', '17/11'],
			valuesCents: [0, 0, 0, 0, 0, 0, 0],
			salesCount: 0,
			totalNetCents: 0
		});

		// 1 second before 11/11 00:00 in Sao Paulo -> excluded
		await insertSale(
			producer.id,
			productId,
			offerId,
			student.id,
			9_000,
			new Date('2026-11-11T02:59:59Z'),
			'released'
		);
		// start of 11/11 in Sao Paulo (released) -> index 0
		await insertSale(
			producer.id,
			productId,
			offerId,
			student.id,
			4_000,
			new Date('2026-11-11T03:00:00Z'),
			'released'
		);
		// two sales on 15/11 in Sao Paulo (one past UTC midnight) -> index 4
		await insertSale(
			producer.id,
			productId,
			offerId,
			student.id,
			3_000,
			new Date('2026-11-15T15:00:00Z'),
			'held'
		);
		await insertSale(
			producer.id,
			productId,
			offerId,
			student.id,
			2_500,
			new Date('2026-11-16T01:00:00Z'),
			'held'
		);
		// reversed sale inside the window -> excluded
		await insertSale(
			producer.id,
			productId,
			offerId,
			student.id,
			8_000,
			new Date('2026-11-15T18:00:00Z'),
			'reversed'
		);
		// sale on 17/11 (today in Sao Paulo) -> index 6
		await insertSale(
			producer.id,
			productId,
			offerId,
			student.id,
			7_000,
			new Date('2026-11-18T01:00:00Z'),
			'held'
		);
		// another producer's sale on 17/11 -> excluded
		await insertSale(
			other.id,
			otherPub.productId,
			otherPub.offerId,
			student.id,
			6_000,
			new Date('2026-11-17T15:00:00Z'),
			'held'
		);

		const panel = await getMoneyPanel(ctx, producer.id, now);
		expect(panel.recentSales).toEqual({
			labels: ['11/11', '12/11', '13/11', '14/11', '15/11', '16/11', '17/11'],
			valuesCents: [4_000, 0, 0, 0, 5_500, 0, 7_000],
			salesCount: 4,
			totalNetCents: 16_500
		});
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
		expect(mine).toMatchObject({ totalCount: 1, pageCount: 1, hasMore: false });
		expect(mine.entries).toMatchObject([
			{
				grossCents: 10_000,
				feeCents: platformFee(10_000),
				percentBp: 2_000,
				amountCents: parts.coproducerCents[0],
				producerCents: parts.producerCents
			}
		]);
		expect(await getStatement(ctx, producer.id, { state: 'released' })).toMatchObject({
			totalCount: 1,
			pageCount: 1,
			hasMore: false
		});
		expect(await getStatement(ctx, producer.id, { state: 'held' })).toMatchObject({
			totalCount: 1,
			pageCount: 1,
			hasMore: false
		});
		const paged = await getStatement(ctx, producer.id, { pageSize: 1 });
		expect(paged).toMatchObject({ hasMore: true, totalCount: 2, pageCount: 2 });
		const pageTwo = await getStatement(ctx, producer.id, { page: 2, pageSize: 1 });
		expect(pageTwo).toMatchObject({ hasMore: false, totalCount: 2, pageCount: 2 });

		const stranger = await newUser('x@example.com');
		expect(await getStatement(ctx, stranger.id)).toMatchObject({
			entries: [],
			totalCount: 0,
			pageCount: 1,
			hasMore: false
		});
		expect(statementSchema.parse({ pageSize: 1_000 }).pageSize).toBe(1_000);
		expect(() => statementSchema.parse({ pageSize: 1_001 })).toThrow(ZodError);

		expect(await db.select().from(ledgerEntry)).toHaveLength(3);
		expect(await listStatementProducts(ctx, co!.id)).toMatchObject([{ id: productId }]);
		expect(await listStatementProducts(ctx, stranger.id)).toEqual([]);
	});
});
