// RF-35: the student opens a ticket on an order, follows it and closes it.

import { openTicket } from '../src/lib/server/services/support';
import { buy, expect, expectAccessible, publishedProduct, test } from './fixtures';

test('opens a ticket on an order, writes again and closes it', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // five screens and axe on each
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id, 9_790);
	const student = await createUser('Bia Rocha');
	const orderId = await buy(ctx, offerId, student.email);
	await signIn(student);

	await page.goto('/student');
	await page.getByRole('link', { name: 'Chamados' }).click();
	await expect(page.getByText('Nenhum chamado ainda')).toBeVisible();
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Abrir um chamado' }).click();
	await expect(page.getByRole('heading', { name: 'Novo chamado' })).toBeVisible();
	await expectAccessible(page);

	// `?order=` preselects the purchase
	await page.goto(`/student/tickets/new?order=${orderId}`);
	await expect(page.getByLabel('Sobre qual compra?')).toHaveValue(orderId);
	// a blank subject is refused with the text under the field, and what was typed stays
	await page.getByLabel('Mensagem').fill('O curso não abre depois da compra.');
	await page.getByRole('button', { name: 'Abrir chamado' }).click();
	await expect(page.getByText('Preencha este campo.')).toBeVisible();
	await expect(page.getByLabel('Mensagem')).toHaveValue('O curso não abre depois da compra.');

	await page.getByLabel('Assunto').fill('Não consigo acessar');
	await page.getByRole('button', { name: 'Abrir chamado' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Não consigo acessar' })).toBeVisible();
	await expect(page.getByText('O curso não abre depois da compra.')).toBeVisible();
	await expectAccessible(page);

	await page.getByLabel('Sua mensagem').fill('Já tentei de outro navegador.');
	await page.getByRole('button', { name: 'Enviar mensagem' }).click();
	await expect(page.getByText('Já tentei de outro navegador.')).toBeVisible();
	await expect(page.getByLabel('Sua mensagem')).toBeEmpty();
	await expect(page.getByLabel('Sua mensagem')).toBeFocused();

	await page.getByRole('button', { name: 'Fechar chamado' }).click();
	await expect(page.getByText('Este chamado está fechado')).toBeVisible();
	await expect(page.getByLabel('Sua mensagem')).toHaveCount(0);
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Chamados' }).first().click();
	await expect(page.getByRole('link', { name: /Não consigo acessar/ })).toContainText('Fechado');
	await expectAccessible(page);
});

test('another student gets a 404 on the ticket', async ({ page, ctx, createUser, signIn }) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id, 9_790);
	const ana = await createUser('Ana Souza');
	const orderId = await buy(ctx, offerId, ana.email);
	const ticketId = await openTicket(ctx, ana.id, { orderId, subject: 'Dúvida', body: 'Oi' });

	await signIn(await createUser('Bruno Dias'));
	const response = await page.goto(`/student/tickets/${ticketId}`);
	expect(response?.status()).toBe(404);
});
