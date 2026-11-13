// Shared by the review specs (review-a11y, review-access, review-captures): one small story
// that leaves every kind of record the app has a screen for. Each call makes its own people,
// so specs running in parallel never see each other's data.

import type { SessionUser } from '../src/lib/server/auth/session';
import { createPasswordToken, RESET_TOKEN_TTL_MS } from '../src/lib/server/auth/password-token';
import type { Ctx } from '../src/lib/server/context';
import { inviteCoproducer } from '../src/lib/server/services/coproduction';
import { startCheckout } from '../src/lib/server/services/checkout';
import { requestPayout } from '../src/lib/server/services/money';
import { requestRefund } from '../src/lib/server/services/refunds';
import { openTicket } from '../src/lib/server/services/support';
import { db, releaseSalesOf, VALID_CPF } from '../src/lib/server/services/testing';
import { buy, publishedProduct } from './fixtures';

export type CreateUser = (name: string, role?: 'user' | 'support') => Promise<SessionUser>;

export async function seedStory(ctx: Ctx, createUser: CreateUser) {
	const producer = await createUser('Paulo Lima');
	const student = await createUser('Bia Rocha');
	const coproducer = await createUser('Carla Dias');
	const support = await createUser('Sônia Dias', 'support');

	const { productId, offerId } = await publishedProduct(ctx, producer.id, 30_000);
	// two paid orders: one asks for a refund, the other still can
	const refundedOrderId = await buy(ctx, offerId, student.email);
	const freeOrderId = await buy(ctx, offerId, student.email);
	const refundId = await requestRefund(ctx, student.id, {
		orderId: refundedOrderId,
		reason: 'O curso não abre no meu celular.'
	});
	const ticketId = await openTicket(ctx, student.id, {
		orderId: freeOrderId,
		subject: 'Não consigo acessar',
		body: 'O curso não abre depois da compra.'
	});
	const coproductionId = await inviteCoproducer(ctx, producer.id, {
		productId,
		email: coproducer.email,
		name: coproducer.name,
		percentBp: 2_000,
		durationDays: 90
	});
	// a charge not yet paid, for the order and the simulator screens
	const { orderId: pendingOrderId, charge } = await startCheckout(ctx, null, {
		offerId,
		method: 'pix',
		name: 'Visitante',
		email: `visitante.${producer.id}@e2e.test`,
		taxId: VALID_CPF
	});
	// released money and a payout in review, for the money screens and the support queue
	await releaseSalesOf(producer.id);
	await requestPayout(ctx, producer.id, 10_000);
	const token = await createPasswordToken(db, student.id, RESET_TOKEN_TTL_MS);

	return {
		producer,
		student,
		coproducer,
		support,
		productId,
		offerId,
		refundedOrderId,
		freeOrderId,
		refundId,
		ticketId,
		coproductionId,
		pendingOrderId,
		externalId: charge.externalId,
		token
	};
}

export type Story = Awaited<ReturnType<typeof seedStory>>;
