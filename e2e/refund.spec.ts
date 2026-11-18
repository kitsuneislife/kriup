// UC-04: the student's orders and a refund request, inside and outside the guarantee,
// the conversation, the contest of a decline and the access of other people.

import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { startCheckout } from '../src/lib/server/services/checkout';
import { producerDecision } from '../src/lib/server/services/refunds';
import { VALID_CPF, days } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, publishedProduct, test } from './fixtures';

/** Opens the refund form of the student's only order and sends it; returns the refund id. */
async function ask(page: Page, reason = 'Não era o que eu esperava do curso.') {
	await page.goto('/student/orders');
	await page.getByRole('link', { name: 'Pedir reembolso' }).click();
	await page.getByLabel('Por que você quer o reembolso?').fill(reason);
	await page.getByRole('button', { name: 'Pedir reembolso' }).click();
	await expect(page).toHaveURL(/\/student\/refunds\//);
	return page.url().split('/').at(-1)!;
}

test('shows an empty state before the first purchase', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Bia Rocha'));
	await page.goto('/student/orders');
	await expect(page.getByText('Você ainda não comprou nada')).toBeVisible();
	await expectAccessible(page);
});

test('offers to finish payment on a pending order', async ({ page, ctx, createUser, signIn }) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	const { orderId } = await startCheckout(ctx, student, {
		offerId,
		method: 'pix',
		name: student.name,
		email: student.email,
		taxId: VALID_CPF
	});
	await signIn(student);

	await page.goto('/student/orders');
	await expect(page.getByRole('link', { name: 'Concluir pagamento' })).toBeVisible();
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Concluir pagamento' }).click();
	await expect(page).toHaveURL(`/orders/${orderId}`);
	await expect(page.getByRole('heading', { name: 'Falta só o pagamento' })).toBeVisible();
});

test('inside the guarantee the refund is approved and the access ends', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // three screens and their axe checks
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	await buy(ctx, offerId, student.email);
	await signIn(student);

	await page.goto('/student');
	await page.getByRole('link', { name: 'Pedidos' }).click();
	await expect(page.getByRole('heading', { name: 'Pedidos', level: 1 })).toBeVisible();
	await expect(page.getByText('Acesso liberado')).toBeVisible();
	await expect(page.getByText(/garantia até/)).toBeVisible();
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Pedir reembolso' }).click();
	await expect(page.getByText('o pedido é aprovado na hora')).toBeVisible();
	await expectAccessible(page);
	await page.getByLabel('Por que você quer o reembolso?').fill('Comprei sem querer.');
	await page.getByRole('button', { name: 'Pedir reembolso' }).click();

	await expect(page.getByRole('heading', { name: 'Reembolso concluído', level: 1 })).toBeVisible();
	await expect(page.getByText('Valor devolvido e acesso encerrado')).toBeVisible();
	await expectAccessible(page);

	await page.goto('/student/orders');
	await expect(page.getByText('Acesso encerrado')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Pedir reembolso' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Ver reembolso' })).toBeVisible();
});

test('outside the guarantee it stays with the producer and shows the deadline', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	await buy(ctx, offerId, student.email, days(new Date(), -10));
	await signIn(student);

	await page.goto('/student/orders');
	await expect(page.getByText(/garantia até/)).toHaveCount(0);
	await page.getByRole('link', { name: 'Pedir reembolso' }).click();
	await expect(page.getByText('o produtor decide')).toBeVisible();
	await page
		.getByLabel('Por que você quer o reembolso?')
		.fill('Passei do prazo, mas o curso não abre.');
	await page.getByRole('button', { name: 'Pedir reembolso' }).click();

	await expect(
		page.getByRole('heading', { name: 'O produtor está analisando o seu pedido', level: 1 })
	).toBeVisible();
	await expect(page.getByText('Quem decide agora')).toBeVisible();
	await expect(page.getByText('Prazo para responder')).toBeVisible();
	await expectAccessible(page);

	// the conversation
	await page.getByLabel('Sua mensagem').fill('Mando o comprovante se ajudar.');
	await page.getByRole('button', { name: 'Enviar' }).click();
	await expect(page.getByText('Mando o comprovante se ajudar.')).toBeVisible();
	await expect(page.getByLabel('Sua mensagem')).toHaveValue('');

	// the access stays while the producer decides, and a second request is not offered
	await page.goto('/student/orders');
	await expect(page.getByText('Acesso liberado')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Pedir reembolso' })).toHaveCount(0);
});

test('a declined refund can be contested once', async ({ page, ctx, createUser, signIn }) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	await buy(ctx, offerId, student.email, days(new Date(), -10));
	await signIn(student);
	const refundId = await ask(page);

	await producerDecision(ctx, producer.id, refundId, {
		decision: 'decline',
		reason: 'O conteúdo foi entregue como anunciado.'
	});
	await page.reload();
	await expect(page.getByRole('heading', { name: 'O produtor recusou o pedido' })).toBeVisible();
	await expect(page.getByText('O conteúdo foi entregue como anunciado.')).toBeVisible();
	await expectAccessible(page);

	await page.getByRole('button', { name: 'Contestar recusa' }).click();
	await expect(
		page.getByRole('heading', { name: 'A plataforma está analisando o seu pedido' })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Contestar recusa' })).toHaveCount(0);
});

test('another student gets 404 on the refund and its form', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const owner = await createUser('Bia Rocha');
	const orderId = await buy(ctx, offerId, owner.email, days(new Date(), -10));
	await signIn(owner);
	const refundId = await ask(page);

	await page.context().clearCookies();
	await signIn(await createUser('Caio Alves'));
	for (const path of [
		`/student/refunds/${refundId}`,
		`/student/orders/${orderId}/refund`,
		`/student/refunds/${randomUUID()}`,
		'/student/refunds/not-a-uuid'
	]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
	}
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the refund request and the message still work', async ({
		page,
		ctx,
		createUser,
		signIn
	}) => {
		const producer = await createUser('Paulo Lima');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const student = await createUser('Bia Rocha');
		await buy(ctx, offerId, student.email, days(new Date(), -10));
		await signIn(student);
		await ask(page);
		await page.getByLabel('Sua mensagem').fill('Olá!');
		await page.getByRole('button', { name: 'Enviar' }).click();
		await expect(page.getByText('Olá!')).toBeVisible();
	});
});
