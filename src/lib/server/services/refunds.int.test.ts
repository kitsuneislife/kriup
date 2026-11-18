import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { PLATFORM_FIXED_FEE_CENTS } from '../../domain/params';
import { platformFee, splitSale } from '../../domain/split';
import { auditLog, enrollment, ledgerEntry, order, refund, user } from '../db/schema';
import { NotFoundError } from '../errors';
import { acceptInvite, inviteCoproducer } from './coproduction';
import { getBalance, previewPayout, releaseHeld, requestPayout } from './money';
import { handlePaymentEvent } from './payments';
import { getSupportQueue } from './support';
import {
	addRefundMessage,
	contestRefund,
	escalateOverdueRefunds,
	getRefund,
	listProducerRefunds,
	producerDecision,
	requestRefund,
	retryApprovedRefunds,
	supportDecision
} from './refunds';
import { buy, days, db, newUser, publishedProduct, rejectsCode, resetDb, testCtx } from './testing';

beforeEach(resetDb);

const PAID = new Date('2026-11-01T12:00:00Z');

async function scenario(ctx = testCtx()) {
	const producer = await newUser('p@example.com');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	const orderId = await buy(ctx, offerId, 'bia@example.com', PAID);
	const [o] = await db.select().from(order).where(eq(order.id, orderId));
	const [s] = await db.select().from(user).where(eq(user.id, o!.studentId));
	const student = { id: s!.id, email: s!.email, name: s!.name, platformRole: s!.platformRole };
	return { ctx, producer, productId, offerId, orderId, student, externalId: o!.externalId! };
}

const refundOf = async (orderId: string) =>
	(await db.select().from(refund).where(eq(refund.orderId, orderId)))[0]!;

describe('inside the guarantee (RN-03, RN-06)', () => {
	it('approves, refunds at the provider, reverses the sale and revokes access', async () => {
		const { ctx, producer, orderId, student, externalId } = await scenario();
		await requestRefund(
			ctx,
			student.id,
			{ orderId, reason: 'Não era o que eu esperava' },
			days(PAID, 2)
		);

		expect(ctx.refunds).toEqual([externalId]);
		expect(ctx.mail.sent.filter((m) => m.to === producer.email)).toHaveLength(0);
		expect(await refundOf(orderId)).toMatchObject({ status: 'completed', owner: 'platform' });
		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		expect(o!.status).toBe('refunded');
		const [e] = await db.select().from(enrollment).where(eq(enrollment.orderId, orderId));
		expect(e!.status).toBe('revoked');

		const entries = await db.select().from(ledgerEntry).where(eq(ledgerEntry.orderId, orderId));
		expect(entries.find((x) => x.type === 'sale')!.state).toBe('reversed');
		expect(entries.find((x) => x.type === 'reversal')).toMatchObject({
			userId: producer.id,
			amountCents: -PLATFORM_FIXED_FEE_CENTS,
			state: 'released'
		});
		expect(await getBalance(db, producer.id)).toEqual({
			heldCents: 0,
			releasedCents: -PLATFORM_FIXED_FEE_CENTS,
			paidOutCents: 0
		});
	});

	it('refuses a second request and a refund of someone else’s order', async () => {
		const { ctx, orderId, student } = await scenario();
		const other = await newUser('x@example.com');
		await expect(
			requestRefund(ctx, other.id, { orderId, reason: 'x' }, days(PAID, 1))
		).rejects.toBeInstanceOf(NotFoundError);
		await requestRefund(ctx, student.id, { orderId, reason: 'x' }, days(PAID, 1));
		await rejectsCode(
			requestRefund(ctx, student.id, { orderId, reason: 'de novo' }, days(PAID, 1)),
			'order_not_refundable'
		);
	});

	it('splits the fee kept between producer and coproducer, adding up exactly', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { productId, offerId } = await publishedProduct(ctx, producer.id, 9_990);
		const invite = await inviteCoproducer(ctx, producer.id, {
			productId,
			email: 'co@example.com',
			name: 'Co',
			percentBp: 3_333,
			durationDays: 30
		});
		const [co] = await db.select().from(user).where(eq(user.email, 'co@example.com'));
		await acceptInvite(ctx, co!.id, invite, days(PAID, -1));
		const orderId = await buy(ctx, offerId, 'bia@example.com', PAID);
		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		await requestRefund(ctx, o!.studentId, { orderId, reason: 'x' }, days(PAID, 1));

		const reversals = await db
			.select()
			.from(ledgerEntry)
			.where(and(eq(ledgerEntry.orderId, orderId), eq(ledgerEntry.type, 'reversal')));
		expect(reversals).toHaveLength(2);
		expect(reversals.reduce((sum, r) => sum + r.amountCents, 0)).toBe(-PLATFORM_FIXED_FEE_CENTS);
		expect(reversals.find((r) => r.userId === co!.id)!.coproductionId).toBe(invite);
	});
});

describe('outside the guarantee (RN-08 to RN-10)', () => {
	it('goes to the producer, who declines with a reason; a contest goes to support', async () => {
		const { ctx, producer, orderId, student } = await scenario();
		const id = await requestRefund(ctx, student.id, { orderId, reason: 'x' }, days(PAID, 10));
		const notice = ctx.mail.sent.find((m) => m.to === producer.email);
		expect(notice).toBeDefined();
		expect(notice!.subject).toBe('Novo pedido de reembolso em Curso de pão');
		expect(notice!.text).toContain('Curso de pão');
		expect(notice!.text).toContain('3 dias');
		expect(notice!.text).toContain(`${ctx.appUrl}/producer/refunds/${id}`);
		expect(await refundOf(orderId)).toMatchObject({
			status: 'with_producer',
			owner: 'producer',
			dueAt: days(PAID, 13)
		});
		expect(await listProducerRefunds(ctx, producer.id)).toHaveLength(1);

		await expect(
			producerDecision(ctx, producer.id, id, { decision: 'decline', reason: ' ' }, days(PAID, 11))
		).rejects.toThrow(/too_small|at least/i);
		await producerDecision(
			ctx,
			producer.id,
			id,
			{ decision: 'decline', reason: 'Curso já concluído' },
			days(PAID, 11)
		);
		expect(await refundOf(orderId)).toMatchObject({
			status: 'declined',
			declineReason: 'Curso já concluído',
			firstResponseAt: days(PAID, 11)
		});

		await contestRefund(ctx, student.id, id, days(PAID, 12));
		await rejectsCode(contestRefund(ctx, student.id, id, days(PAID, 12)), 'already_contested');
		expect(await refundOf(orderId)).toMatchObject({ status: 'with_platform', contested: true });

		const support = await newUser('s@example.com', 'support');
		await supportDecision(ctx, support.id, id, { decision: 'approve' }, days(PAID, 13));
		expect(await refundOf(orderId)).toMatchObject({ status: 'completed' });
		expect(await db.select().from(auditLog)).toMatchObject([{ action: 'refund.approve' }]);
	});

	it('escalates to support once the producer misses the deadline', async () => {
		const { ctx, producer, orderId, student } = await scenario();
		const id = await requestRefund(ctx, student.id, { orderId, reason: 'x' }, days(PAID, 10));
		expect(await escalateOverdueRefunds(ctx, days(PAID, 12))).toBe(0);
		await rejectsCode(
			producerDecision(ctx, producer.id, id, { decision: 'approve' }, days(PAID, 13)),
			'deadline_passed'
		);
		expect(await escalateOverdueRefunds(ctx, days(PAID, 13))).toBe(1);
		expect(await refundOf(orderId)).toMatchObject({
			status: 'with_platform',
			owner: 'platform',
			dueAt: days(PAID, 16)
		});
	});

	it('only support decides an escalated request', async () => {
		const { ctx, orderId, student } = await scenario();
		const id = await requestRefund(ctx, student.id, { orderId, reason: 'x' }, days(PAID, 10));
		await escalateOverdueRefunds(ctx, days(PAID, 13));
		const support = await newUser('s@example.com', 'support');
		expect((await getSupportQueue(ctx, support)).refunds).toMatchObject([
			{ id, studentName: student.name, contested: false, dueAt: days(PAID, 16) }
		]);
		const impostor = await newUser('i@example.com');
		await expect(
			supportDecision(ctx, impostor.id, id, { decision: 'approve' }, days(PAID, 14))
		).rejects.toBeInstanceOf(NotFoundError);
		expect(await refundOf(orderId)).toMatchObject({ status: 'with_platform' });
	});

	it('treats a malformed id as a missing refund', async () => {
		const { ctx, producer, student } = await scenario();
		await expect(
			producerDecision(ctx, producer.id, 'nope', { decision: 'approve' })
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(contestRefund(ctx, student.id, 'nope')).rejects.toBeInstanceOf(NotFoundError);
		await expect(getRefund(ctx, student, 'nope')).rejects.toBeInstanceOf(NotFoundError);
		await expect(addRefundMessage(ctx, student, 'nope', 'oi')).rejects.toBeInstanceOf(
			NotFoundError
		);
		const support = await newUser('s@example.com', 'support');
		await expect(
			supportDecision(ctx, support.id, 'nope', { decision: 'decline', reason: 'x' })
		).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe('settlement', () => {
	it('stays approved when the provider fails, and the daily job finishes it', async () => {
		const { ctx, orderId, student } = await scenario();
		ctx.failRefunds = true;
		await requestRefund(ctx, student.id, { orderId, reason: 'x' }, days(PAID, 1));
		expect(await refundOf(orderId)).toMatchObject({ status: 'approved' });
		expect(
			await db.select().from(ledgerEntry).where(eq(ledgerEntry.type, 'reversal'))
		).toHaveLength(0);

		ctx.failRefunds = false;
		expect(await retryApprovedRefunds(ctx, days(PAID, 2))).toBe(1);
		expect(await refundOf(orderId)).toMatchObject({ status: 'completed' });
	});

	it('records a refund made in the provider panel (webhook)', async () => {
		const { ctx, orderId, externalId } = await scenario();
		expect(
			await handlePaymentEvent(
				ctx,
				{ type: 'refunded', externalId, amountCents: 10_000 },
				days(PAID, 20)
			)
		).toBe('applied');
		expect(await refundOf(orderId)).toMatchObject({ status: 'completed', owner: 'platform' });
		expect(
			await handlePaymentEvent(
				ctx,
				{ type: 'refunded', externalId, amountCents: 10_000 },
				days(PAID, 20)
			)
		).toBe('ignored');
	});

	it('leaves the balance negative after a refund of money already withdrawn (RN-07)', async () => {
		const { ctx, producer, orderId, student } = await scenario();
		await releaseHeld(ctx, days(PAID, 7));
		const net = splitSale(10_000, platformFee(10_000)).producerCents;
		await requestPayout(ctx, producer.id, net, days(PAID, 8));

		const id = await requestRefund(ctx, student.id, { orderId, reason: 'x' }, days(PAID, 9));
		await producerDecision(ctx, producer.id, id, { decision: 'approve' }, days(PAID, 9));

		const balance = await getBalance(db, producer.id);
		expect(balance.releasedCents).toBe(-net - PLATFORM_FIXED_FEE_CENTS);
		expect(await previewPayout(ctx, producer.id, 5_000)).toEqual({
			ok: false,
			reason: 'negative_balance'
		});
	});
});

describe('conversation (RF-31)', () => {
	it('lets the student, the producer and support talk, and nobody else', async () => {
		const { ctx, producer, orderId, student } = await scenario();
		const id = await requestRefund(ctx, student.id, { orderId, reason: 'x' }, days(PAID, 10));
		await addRefundMessage(ctx, student, id, 'Oi, pode ver?');
		await addRefundMessage(ctx, producer, id, 'Vou analisar.');
		const stranger = await newUser('z@example.com');
		await expect(addRefundMessage(ctx, stranger, id, 'oi')).rejects.toBeInstanceOf(NotFoundError);

		const view = await getRefund(ctx, student, id);
		expect(view.viewerRole).toBe('student');
		expect(view.student.name).toBe(student.name);
		expect((await getRefund(ctx, producer, id)).viewerRole).toBe('producer');
		expect(view.messages.map((m) => m.body)).toEqual(['Oi, pode ver?', 'Vou analisar.']);
	});
});
