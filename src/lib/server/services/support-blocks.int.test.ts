import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { user } from '../db/schema';
import { NotFoundError } from '../errors';
import { createProduct, publishProduct } from './catalog';
import { completePayout, releaseHeld, requestPayout } from './money';
import {
	escalateOverdueRefunds,
	producerDecision,
	requestRefund,
	supportDecision
} from './refunds';
import {
	closeTicket,
	createBlock,
	findBlockTarget,
	getPlatformMetrics,
	liftBlock,
	listActiveBlocks,
	listAuditTrail,
	listMyTickets,
	openTicket
} from './support';
import { brand, buy, days, db, newUser, publishedProduct, resetDb, testCtx } from './testing';

beforeEach(resetDb);

const reason = 'Contestação em análise';
const nextStep = 'Envie o comprovante';

describe('findBlockTarget', () => {
	it('finds the person by e-mail, in any case, with their products', async () => {
		const ctx = testCtx();
		const support = await newUser('s@example.com', 'support');
		const producer = await newUser('p@example.com', 'user', 'Paulo Lima');
		const { productId } = await publishedProduct(ctx, producer.id, 10_000, 'Curso de pão');

		expect(await findBlockTarget(ctx, support, ' P@Example.com ')).toEqual({
			id: producer.id,
			name: 'Paulo Lima',
			email: 'p@example.com',
			products: [{ id: productId, name: 'Curso de pão' }]
		});
		expect(await findBlockTarget(ctx, support, 'nobody@example.com')).toBeNull();
		await expect(findBlockTarget(ctx, support, 'not an e-mail')).rejects.toBeInstanceOf(ZodError);
	});

	it('answers NotFound to anyone but support', async () => {
		const someone = await newUser('p@example.com');
		await expect(findBlockTarget(testCtx(), someone, 'p@example.com')).rejects.toBeInstanceOf(
			NotFoundError
		);
	});
});

describe('listActiveBlocks', () => {
	it('lists the blocks in force of everyone, newest first, without lifted or ended ones', async () => {
		const ctx = testCtx();
		const support = await newUser('s@example.com', 'support', 'Sara Dias');
		const paulo = await newUser('p@example.com', 'user', 'Paulo Lima');
		const bia = await newUser('b@example.com', 'user', 'Bia Rocha');
		const { productId } = await publishedProduct(ctx, bia.id, 10_000, 'Curso de pão');

		const balance = await createBlock(ctx, support.id, {
			userId: paulo.id,
			target: 'balance',
			reason,
			nextStep
		});
		const productBlock = await createBlock(ctx, support.id, {
			userId: bia.id,
			target: 'product',
			productId,
			reason,
			nextStep
		});
		const lifted = await createBlock(ctx, support.id, {
			userId: bia.id,
			target: 'balance',
			reason,
			nextStep
		});
		await liftBlock(ctx, support.id, lifted);
		await createBlock(ctx, support.id, {
			userId: bia.id,
			target: 'account',
			reason,
			nextStep,
			endsAt: new Date('2030-01-01T00:00:00Z')
		});

		const list = await listActiveBlocks(ctx, support, new Date('2030-01-02T00:00:00Z'));
		expect(list.map((b) => b.id)).toEqual([productBlock, balance]);
		expect(list[0]).toMatchObject({
			target: 'product',
			userName: 'Bia Rocha',
			userEmail: 'b@example.com',
			productName: 'Curso de pão',
			createdByName: 'Sara Dias',
			reason,
			nextStep
		});
		expect(list[1]).toMatchObject({ target: 'balance', userName: 'Paulo Lima', productName: null });
	});

	it('answers NotFound to anyone but support', async () => {
		const someone = await newUser('p@example.com');
		await expect(listActiveBlocks(testCtx(), someone)).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe('listAuditTrail', () => {
	it('names the target and the reason of every kind of record', async () => {
		const ctx = testCtx();
		const support = await newUser('s@example.com', 'support', 'Sara Dias');
		const producer = await newUser('p@example.com', 'user', 'Paulo Lima');
		const { productId, offerId } = await publishedProduct(ctx, producer.id, 10_000, 'Curso de pão');
		const paidAt = new Date('2026-01-01T12:00:00Z');
		const orderId = await buy(ctx, offerId, 'bia@example.com', paidAt);
		const sale = await db.query.order.findFirst({ where: (o, { eq }) => eq(o.id, orderId) });
		const student = { id: sale!.studentId };

		const blockId = await createBlock(ctx, support.id, {
			userId: producer.id,
			target: 'product',
			productId,
			reason,
			nextStep
		});
		await liftBlock(ctx, support.id, blockId);

		const refundId = await requestRefund(
			ctx,
			student.id,
			{ orderId, reason: 'Não era o que eu esperava' },
			days(paidAt, 10)
		);
		await escalateOverdueRefunds(ctx, days(paidAt, 13));
		await supportDecision(
			ctx,
			support.id,
			refundId,
			{ decision: 'decline', reason: 'Curso entregue' },
			days(paidAt, 13)
		);

		await releaseHeld(ctx, days(paidAt, 8));
		const payoutId = await requestPayout(ctx, producer.id, 5_000);
		await completePayout(ctx, support.id, payoutId);

		const ticketId = await openTicket(ctx, student.id, {
			orderId,
			subject: 'Vídeo não abre',
			body: 'Ajuda'
		});
		await closeTicket(ctx, support, ticketId);

		const trail = await listAuditTrail(ctx, support);
		expect(trail.map((e) => [e.action, e.actorName, e.target, e.reason])).toEqual([
			[
				'ticket.close',
				'Sara Dias',
				{ kind: 'ticket', studentName: 'bia', subject: 'Vídeo não abre' },
				null
			],
			['payout.complete', 'Sara Dias', { kind: 'payout', userName: 'Paulo Lima' }, null],
			[
				'refund.decline',
				'Sara Dias',
				{ kind: 'refund', studentName: 'bia', productName: 'Curso de pão' },
				'Curso entregue'
			],
			[
				'block.lift',
				'Sara Dias',
				{ kind: 'block', target: 'product', userName: 'Paulo Lima', productName: 'Curso de pão' },
				null
			],
			[
				'block.create',
				'Sara Dias',
				{ kind: 'block', target: 'product', userName: 'Paulo Lima', productName: 'Curso de pão' },
				reason
			]
		]);
	});

	it('answers NotFound to anyone but support', async () => {
		const someone = await newUser('p@example.com');
		await expect(listAuditTrail(testCtx(), someone)).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe('listMyTickets', () => {
	it('returns the student tickets newest first with their productName', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com', 'user', 'Paulo Lima');
		const { offerId: breadOffer } = await publishedProduct(
			ctx,
			producer.id,
			10_000,
			'Curso de pão'
		);
		const { offerId: cakeOffer } = await publishedProduct(
			ctx,
			producer.id,
			15_000,
			'Curso de bolo'
		);
		const orderBread = await buy(ctx, breadOffer, 'bia@example.com');
		const sale = await db.query.order.findFirst({ where: (o, { eq }) => eq(o.id, orderBread) });
		const studentId = sale!.studentId;
		const orderCake = await buy(ctx, cakeOffer, 'bia@example.com');
		const otherOrder = await buy(ctx, breadOffer, 'outro@example.com');
		const otherSale = await db.query.order.findFirst({
			where: (o, { eq }) => eq(o.id, otherOrder)
		});

		await openTicket(ctx, studentId, {
			orderId: orderBread,
			subject: 'Acesso ao módulo 1',
			body: 'Ajuda'
		});
		await openTicket(ctx, otherSale!.studentId, {
			orderId: otherOrder,
			subject: 'Chamado de outra aluna',
			body: 'Oi'
		});
		const secondTicketId = await openTicket(ctx, studentId, {
			orderId: orderCake,
			subject: 'Receita em PDF',
			body: 'Onde baixo?'
		});

		const tickets = await listMyTickets(ctx, studentId);
		expect(tickets).toHaveLength(2);
		expect(tickets.map((t) => [t.subject, t.productName])).toEqual([
			['Receita em PDF', 'Curso de bolo'],
			['Acesso ao módulo 1', 'Curso de pão']
		]);
		expect(tickets[0]?.id).toBe(secondTicketId);
	});
});

describe('getPlatformMetrics', () => {
	it('answers NotFound to anyone but support', async () => {
		const someone = await newUser('p@example.com');
		await expect(getPlatformMetrics(testCtx(), someone)).rejects.toBeInstanceOf(NotFoundError);
	});

	it('returns null medians and zeroed totals when the platform has no activity', async () => {
		const ctx = testCtx();
		const support = await newUser('s@example.com', 'support');
		const metrics = await getPlatformMetrics(ctx, support, new Date('2026-06-15T15:00:00Z'));

		expect(metrics.medianHoursToFirstPublish).toBeNull();
		expect(metrics.conversion).toEqual({
			totalProducts: 0,
			publishedProducts: 0,
			publishedRatePercent: 0
		});
		expect(metrics.medianHoursToFirstRefundResponse).toBeNull();
		expect(metrics.ticketsByProducer).toEqual([]);
		expect(metrics.paidOrdersCount).toBe(0);
		expect(metrics.grossVolumeCents).toBe(0);
		expect(metrics.platformFeeCents).toBe(0);
		expect(metrics.activeBlocksCount).toBe(0);
		expect(metrics.dailyOrders.labels).toHaveLength(7);
		expect(metrics.dailyOrders.counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
		expect(metrics.dailyOrders.volumeCents).toEqual([0, 0, 0, 0, 0, 0, 0]);
	});

	it('computes Lean Canvas medians, conversion, ticketsByProducer, active totals and 7-day buckets', async () => {
		const ctx = testCtx();
		const support = await newUser('s@example.com', 'support', 'Sara Dias');
		const t0 = new Date('2026-06-01T10:00:00Z');
		const hours = (from: Date, h: number) => new Date(from.getTime() + h * 3_600_000);

		const paulo = await newUser('paulo@example.com', 'user', 'Paulo Lima');
		const bia = await newUser('bia@example.com', 'user', 'Bia Rocha');
		const caio = await newUser('caio@example.com', 'user', 'Caio Melo');
		for (const u of [paulo, bia, caio]) {
			await db.update(user).set({ createdAt: t0 }).where(eq(user.id, u.id));
		}

		// Paulo publishes at +2h and +10h -> min is 2h.
		const pauloFirst = await createProduct(ctx, paulo.id, {
			templateSlug: 'online-course',
			name: 'Curso de pão',
			audience: 'iniciantes',
			priceCents: 10_000,
			brand
		});
		await publishProduct(ctx, paulo.id, pauloFirst, hours(t0, 2));

		const pauloSecond = await createProduct(ctx, paulo.id, {
			templateSlug: 'online-course',
			name: 'Pão avançado',
			audience: 'padeiros',
			priceCents: 20_000,
			brand
		});
		await publishProduct(ctx, paulo.id, pauloSecond, hours(t0, 10));

		// Bia publishes at +5h and keeps one draft; Caio keeps one draft -> 3 of 5 published (60%).
		const biaPublished = await createProduct(ctx, bia.id, {
			templateSlug: 'online-course',
			name: 'Confeitaria fina',
			audience: 'confeiteiros',
			priceCents: 10_000,
			brand
		});
		await publishProduct(ctx, bia.id, biaPublished, hours(t0, 5));

		await createProduct(ctx, bia.id, {
			templateSlug: 'online-course',
			name: 'Rascunho da Bia',
			audience: 'iniciantes',
			priceCents: 10_000,
			brand
		});
		await createProduct(ctx, caio.id, {
			templateSlug: 'online-course',
			name: 'Rascunho do Caio',
			audience: 'iniciantes',
			priceCents: 10_000,
			brand
		});

		const [pauloOffer] = await db.query.offer.findMany({
			where: (o, { eq }) => eq(o.productId, pauloFirst)
		});
		const [biaOffer] = await db.query.offer.findMany({
			where: (o, { eq }) => eq(o.productId, biaPublished)
		});

		// Now is 2026-06-15T15:00:00Z (12:00 in São Paulo -> window 09/06 .. 15/06).
		const now = new Date('2026-06-15T15:00:00Z');
		const oldPaidAt = new Date('2026-06-02T12:00:00Z');
		const order1 = await buy(ctx, pauloOffer!.id, 'aluna1@example.com', oldPaidAt);
		const order2 = await buy(ctx, biaOffer!.id, 'aluna2@example.com', oldPaidAt);
		// Recent order inside the 7-day São Paulo window (2026-06-15T01:30:00Z = 14/06 22:30 BRT).
		const order3 = await buy(
			ctx,
			pauloOffer!.id,
			'aluna3@example.com',
			new Date('2026-06-15T01:30:00Z')
		);

		const s1 = (await db.query.order.findFirst({ where: (o, { eq }) => eq(o.id, order1) }))!;
		const s2 = (await db.query.order.findFirst({ where: (o, { eq }) => eq(o.id, order2) }))!;
		const s3 = (await db.query.order.findFirst({ where: (o, { eq }) => eq(o.id, order3) }))!;

		// Refunds outside guarantee: one answered in 4h, one answered in 8h, one unanswered.
		const openedAt = days(oldPaidAt, 10);
		const refund1 = await requestRefund(
			ctx,
			s1.studentId,
			{ orderId: order1, reason: 'Motivo 1' },
			openedAt
		);
		await producerDecision(
			ctx,
			paulo.id,
			refund1,
			{ decision: 'decline', reason: 'Acesso usado' },
			hours(openedAt, 4)
		);

		const refund2 = await requestRefund(
			ctx,
			s2.studentId,
			{ orderId: order2, reason: 'Motivo 2' },
			openedAt
		);
		await producerDecision(
			ctx,
			bia.id,
			refund2,
			{ decision: 'decline', reason: 'Conteúdo completo' },
			hours(openedAt, 8)
		);

		const orderUnanswered = await buy(ctx, biaOffer!.id, 'aluna4@example.com', oldPaidAt);
		const s4 = (await db.query.order.findFirst({
			where: (o, { eq }) => eq(o.id, orderUnanswered)
		}))!;
		await requestRefund(
			ctx,
			s4.studentId,
			{ orderId: orderUnanswered, reason: 'Ainda sem resposta' },
			openedAt
		);

		// Tickets: Paulo gets 2 (1 closed, 1 open), Bia gets 1 (open).
		const closedId = await openTicket(ctx, s1.studentId, {
			orderId: order1,
			subject: 'Dúvida 1',
			body: 'Oi'
		});
		await closeTicket(ctx, support, closedId, now);
		await openTicket(ctx, s3.studentId, {
			orderId: order3,
			subject: 'Dúvida 2',
			body: 'Oi'
		});
		await openTicket(ctx, s2.studentId, {
			orderId: order2,
			subject: 'Dúvida 3',
			body: 'Oi'
		});

		await createBlock(ctx, support.id, {
			userId: caio.id,
			target: 'balance',
			reason,
			nextStep
		});

		const metrics = await getPlatformMetrics(ctx, support, now);
		expect(metrics.medianHoursToFirstPublish).toBe(3.5);
		expect(metrics.conversion).toEqual({
			totalProducts: 5,
			publishedProducts: 3,
			publishedRatePercent: 60
		});
		expect(metrics.medianHoursToFirstRefundResponse).toBe(6);
		expect(metrics.ticketsByProducer).toEqual([
			{
				producerId: paulo.id,
				producerName: 'Paulo Lima',
				producerEmail: 'paulo@example.com',
				ticketCount: 2,
				openTicketCount: 1
			},
			{
				producerId: bia.id,
				producerName: 'Bia Rocha',
				producerEmail: 'bia@example.com',
				ticketCount: 1,
				openTicketCount: 1
			}
		]);
		expect(metrics.paidOrdersCount).toBe(4);
		expect(metrics.grossVolumeCents).toBe(40_000);
		expect(metrics.platformFeeCents).toBe(s1.feeCents * 4);
		expect(metrics.activeBlocksCount).toBe(1);
		expect(metrics.dailyOrders.labels).toEqual([
			'09/06',
			'10/06',
			'11/06',
			'12/06',
			'13/06',
			'14/06',
			'15/06'
		]);
		expect(metrics.dailyOrders.counts).toEqual([0, 0, 0, 0, 0, 1, 0]);
		expect(metrics.dailyOrders.volumeCents).toEqual([0, 0, 0, 0, 0, 10_000, 0]);
	});
});
