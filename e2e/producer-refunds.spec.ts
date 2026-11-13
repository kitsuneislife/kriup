// UC-05: the producer's refund queue and decision. Decline with a justification the
// student reads, approve and the sale is reversed, the field error, a request past the
// deadline and the access of other people.

import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import type { SessionUser } from '../src/lib/server/auth/session';
import type { Ctx } from '../src/lib/server/context';
import { requestRefund } from '../src/lib/server/services/refunds';
import { days } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

/**
 * A sale to `student` paid long before `openedAt`, so the request is outside the guarantee
 * and goes to the producer; returns the refund id.
 */
async function pendingRefund(
	ctx: Ctx,
	offerId: string,
	student: SessionUser,
	reason = 'O curso não abre no meu celular.',
	openedAt = new Date()
) {
	const orderId = await buy(ctx, offerId, student.email, days(openedAt, -10));
	return requestRefund(ctx, student.id, { orderId, reason }, openedAt);
}

async function openFromQueue(page: Page, studentName: string) {
	await page.goto('/producer/refunds');
	await page.getByRole('link', { name: `Responder de ${studentName}` }).click();
	await expect(
		page.getByRole('heading', { name: 'O aluno pediu reembolso', level: 1 })
	).toBeVisible();
}

test('shows an empty queue and the sidebar item', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Paulo Lima'));
	await page.goto('/producer');
	await page.getByRole('link', { name: 'Reembolsos' }).click();
	await expect(page.getByRole('heading', { name: 'Reembolsos', level: 1 })).toBeVisible();
	await expect(page.getByText('Nenhum pedido de reembolso')).toBeVisible();
	await expectAccessible(page);
});

test('a decline needs a justification, and the student reads it', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // two people, three screens and their axe checks
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	const refundId = await pendingRefund(ctx, offerId, student);
	await signIn(producer);

	await page.goto('/producer/refunds');
	const queue = page.getByRole('listitem').filter({ hasText: 'Bia Rocha' });
	await expect(queue.getByText('Com o produtor')).toBeVisible();
	await expect(queue.getByText('Faltam 3 dias')).toBeVisible();
	await expect(queue.getByText('O curso não abre no meu celular.')).toBeVisible();
	await expectAccessible(page);

	await openFromQueue(page, 'Bia Rocha');
	await hydrated(page);
	await expect(page.getByText('O curso não abre no meu celular.')).toBeVisible();
	await expect(page.getByText(/Faltam 3 dias/)).toBeVisible();
	await expect(page.getByText('Você analisa')).toBeVisible();
	await expectAccessible(page);

	// blank is refused on the field, and nothing changes
	const justification = page.getByLabel('Justificativa da recusa');
	await justification.fill('   ');
	await page.getByRole('button', { name: 'Recusar reembolso' }).click();
	await expect(page.getByText('Preencha este campo.')).toBeVisible();
	await expect(justification).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByRole('heading', { name: 'O aluno pediu reembolso' })).toBeVisible();

	// a message in the conversation, then the decline
	await page.getByLabel('Sua mensagem').fill('Testei no celular e abriu normalmente.');
	await page.getByRole('button', { name: 'Enviar' }).click();
	await expect(page.getByText('Testei no celular e abriu normalmente.')).toBeVisible();

	await justification.fill('O curso abre no celular; enviei na conversa como acessar.');
	await page.getByRole('button', { name: 'Recusar reembolso' }).click();
	await expect(
		page.getByRole('heading', { name: 'Você recusou o pedido', level: 1 })
	).toBeVisible();
	await expect(page.getByText('Recusa enviada')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Recusar reembolso' })).toHaveCount(0);
	await expect(page.getByText('O aluno pode contestar')).toBeVisible();
	await expectAccessible(page);

	await page.goto('/producer/refunds');
	await expect(page.getByText('Nenhum pedido espera por você agora.')).toBeVisible();
	await expect(page.getByText('Recusado por você')).toBeVisible();

	await page.context().clearCookies();
	await signIn(student);
	await page.goto(`/student/refunds/${refundId}`);
	await expect(page.getByRole('heading', { name: 'O produtor recusou o pedido' })).toBeVisible();
	await expect(
		page.getByText('O curso abre no celular; enviei na conversa como acessar.')
	).toBeVisible();
	await expect(page.getByText('Testei no celular e abriu normalmente.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Contestar recusa' })).toBeVisible();
});

test('an approval returns the money and reverses the sale', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	const refundId = await pendingRefund(ctx, offerId, student);
	await signIn(producer);

	await openFromQueue(page, 'Bia Rocha');
	await hydrated(page);
	await page.getByRole('button', { name: 'Aprovar reembolso' }).click();
	const dialog = page.getByRole('dialog', { name: 'Aprovar reembolso?' });
	await expect(dialog.getByText('Esta decisão não pode ser desfeita.')).toBeVisible();
	await expectAccessible(page);
	// cancelling writes nothing
	await dialog.getByRole('button', { name: 'Cancelar' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('heading', { name: 'O aluno pediu reembolso' })).toBeVisible();

	await page.getByRole('button', { name: 'Aprovar reembolso' }).click();
	await dialog.getByRole('button', { name: 'Aprovar e devolver' }).click();
	await expect(page.getByRole('heading', { name: 'Reembolso concluído', level: 1 })).toBeVisible();
	await expect(dialog).toBeHidden();
	await expect(page.getByText('Reembolso aprovado', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('Valor devolvido e acesso encerrado')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Aprovar reembolso' })).toHaveCount(0);
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Ver no extrato' }).click();
	const statement = page.getByRole('region', { name: 'Extrato' });
	await expect(statement.getByText('Estornado')).toBeVisible();
	await expect(statement.getByText(/taxa fixa, que a plataforma não devolve/)).toBeVisible();

	// the student lost the access
	await page.context().clearCookies();
	await signIn(student);
	await page.goto(`/student/refunds/${refundId}`);
	await expect(page.getByRole('heading', { name: 'Reembolso concluído' })).toBeVisible();
	await page.goto('/student/orders');
	await expect(page.getByText('Acesso encerrado')).toBeVisible();
});

test('a request past the deadline is named and can no longer be decided', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	// opened four days ago: the three days to answer are gone, the job has not run yet
	await pendingRefund(
		ctx,
		offerId,
		await createUser('Caio Alves'),
		'Atrasou.',
		days(new Date(), -4)
	);
	await pendingRefund(ctx, offerId, await createUser('Bia Rocha'));
	await signIn(producer);

	await page.goto('/producer/refunds');
	await expect(page.getByRole('link', { name: 'Responder de Bia Rocha' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Responder de Caio Alves' })).toHaveCount(0);
	const late = page.getByRole('listitem').filter({ hasText: 'Caio Alves' });
	await expect(late.getByText('Prazo encerrado')).toBeVisible();

	await late.getByRole('link', { name: 'Ver pedido de Caio Alves' }).click();
	await expect(
		page.getByRole('heading', { name: 'O prazo para responder terminou', level: 1 })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Recusar reembolso' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Aprovar reembolso' })).toHaveCount(0);
	await expect(page.getByLabel('Sua mensagem')).toBeVisible();
	await expectAccessible(page);
});

test('another producer and the student get 404 on the producer screen', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	const refundId = await pendingRefund(ctx, offerId, student);

	await signIn(await createUser('Rita Souza'));
	await page.goto('/producer/refunds');
	await expect(page.getByText('Nenhum pedido de reembolso')).toBeVisible();
	for (const path of [
		`/producer/refunds/${refundId}`,
		`/producer/refunds/${randomUUID()}`,
		'/producer/refunds/not-a-uuid'
	]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
	}
	// a form posted straight to the action is refused too
	const post = await page.request.post(`/producer/refunds/${refundId}?/approve`, {
		form: {},
		headers: { origin: new URL(page.url()).origin }
	});
	expect(post.status()).toBe(404);

	await page.context().clearCookies();
	await signIn(student);
	const response = await page.goto(`/producer/refunds/${refundId}`);
	expect(response?.status()).toBe(404);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the approval is confirmed on the page, and the decline works', async ({
		page,
		ctx,
		createUser,
		signIn
	}) => {
		const producer = await createUser('Paulo Lima');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const first = await pendingRefund(ctx, offerId, await createUser('Bia Rocha'));
		const second = await pendingRefund(ctx, offerId, await createUser('Caio Alves'));
		await signIn(producer);

		await page.goto(`/producer/refunds/${first}`);
		await page.getByRole('link', { name: 'Aprovar reembolso' }).click();
		await expect(page.getByRole('heading', { name: 'Confirmar aprovação' })).toBeVisible();
		await page.getByRole('button', { name: 'Aprovar e devolver' }).click();
		await expect(
			page.getByRole('heading', { name: 'Reembolso concluído', level: 1 })
		).toBeVisible();

		await page.goto(`/producer/refunds/${second}`);
		await page.getByLabel('Justificativa da recusa').fill('O conteúdo foi entregue.');
		await page.getByRole('button', { name: 'Recusar reembolso' }).click();
		await expect(
			page.getByRole('heading', { name: 'Você recusou o pedido', level: 1 })
		).toBeVisible();
	});
});
