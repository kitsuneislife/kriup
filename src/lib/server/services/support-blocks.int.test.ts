import { beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { NotFoundError } from '../errors';
import { completePayout, releaseHeld, requestPayout } from './money';
import { escalateOverdueRefunds, requestRefund, supportDecision } from './refunds';
import {
	closeTicket,
	createBlock,
	findBlockTarget,
	liftBlock,
	listActiveBlocks,
	listAuditTrail,
	openTicket
} from './support';
import { buy, days, db, newUser, publishedProduct, resetDb, testCtx } from './testing';

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
