// UC-02: the public sales page, the checkout and the order page, paid through the
// development simulator (the e2e server runs `vite dev`, so it exists).

import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { createProduct } from '../src/lib/server/services/catalog';
import { VALID_CPF, brand } from '../src/lib/server/services/testing';
import { expect, expectAccessible, publishedProduct, test } from './fixtures';

/** Fills the guest checkout and sends it with `method`. */
async function checkout(page: Page, method: 'Pix' | 'Cartão', taxId = VALID_CPF) {
	await page.getByLabel('Nome completo').fill('Ana Souza');
	await page.getByLabel('E-mail').fill(`ana.${randomUUID()}@e2e.test`);
	await page.getByLabel('CPF ou CNPJ').fill(taxId);
	await page.getByRole('radio', { name: method }).check();
	await page
		.getByRole('button', { name: method === 'Pix' ? 'Gerar Pix' : 'Continuar para o cartão' })
		.click();
}

const simulate = async (page: Page, outcome: 'Aprovar pagamento' | 'Recusar' | 'Expirar') => {
	await page.getByRole('link', { name: 'Abrir simulador' }).click();
	await page.getByRole('button', { name: outcome }).click();
};

test('shows the sales page and buys with Pix until the student area', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // four screens and two axe checks
	const producer = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, producer.id, 9_790);

	const buyer = await createUser('Bia Rocha');
	await signIn(buyer);
	await page.goto(`/p/${productId}`);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByText('R$ 97,90').first()).toBeVisible();
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Comprar agora' }).click();
	await expect(page.getByRole('heading', { name: 'Finalizar compra' })).toBeVisible();
	// a signed-in buyer buys as themself
	await expect(page.getByText(`Comprando como ${buyer.name}`)).toBeVisible();
	await page.getByLabel('CPF ou CNPJ').fill(VALID_CPF);
	await page.getByRole('button', { name: 'Gerar Pix' }).click();

	await expect(page.getByRole('heading', { name: 'Falta só o pagamento' })).toBeVisible();
	await expect(page.getByLabel('Pix copia e cola')).not.toBeEmpty();
	await expectAccessible(page);

	await simulate(page, 'Aprovar pagamento');
	await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible();
	await page.getByRole('link', { name: 'Ir para meus produtos' }).click();
	await expect(page).toHaveURL('/student');
	await expect(page.getByRole('heading', { name: 'Meus cursos' })).toBeVisible();
});

test('the order page notices a payment on its own', async ({ page, ctx, createUser }) => {
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	await page.goto(`/p/${productId}/checkout?offer=${offerId}`);
	await checkout(page, 'Pix');
	await expect(page.getByRole('heading', { name: 'Falta só o pagamento' })).toBeVisible();

	// the provider confirms behind the page's back, like a webhook would
	const externalId = new URL(
		(await page.getByRole('link', { name: 'Abrir simulador' }).getAttribute('href'))!
	).pathname
		.split('/')
		.at(-1)!;
	const response = await page.request.post(`/api/dev/payments/${externalId}`, {
		data: { outcome: 'paid' }
	});
	expect(response.ok()).toBe(true);
	await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible({
		timeout: 10_000
	});
});

test('refuses an invalid CPF and keeps what was typed', async ({ page, ctx, createUser }) => {
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	await page.goto(`/p/${productId}/checkout?offer=${offerId}`);
	await checkout(page, 'Cartão', '111.111.111-11');

	await expect(page.getByText('CPF ou CNPJ inválido.')).toBeVisible();
	await expect(page.getByLabel('Nome completo')).toHaveValue('Ana Souza');
	await expect(page.getByRole('radio', { name: 'Cartão' })).toBeChecked();
	await expectAccessible(page);
});

test('a declined card offers to try again', async ({ page, ctx, createUser }) => {
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	await page.goto(`/p/${productId}/checkout?offer=${offerId}`);
	await checkout(page, 'Cartão');

	// the card goes straight to the provider's page: here, the simulator
	await page.getByRole('button', { name: 'Recusar' }).click();
	await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible();
	await page.getByRole('link', { name: 'Tentar de novo' }).click();
	await expect(page).toHaveURL(`/p/${productId}`);
});

test('an expired Pix says nothing was charged', async ({ page, ctx, createUser }) => {
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	await page.goto(`/p/${productId}/checkout?offer=${offerId}`);
	await checkout(page, 'Pix');

	await simulate(page, 'Expirar');
	await expect(page.getByRole('heading', { name: 'O Pix expirou' })).toBeVisible();
	await expect(page.getByText('nada foi cobrado')).toBeVisible();
	await expectAccessible(page);
});

test('answers 404 for a product not on sale or a wrong address', async ({
	page,
	ctx,
	createUser
}) => {
	const producer = await createUser('Paulo Lima');
	const draft = await createProduct(ctx, producer.id, {
		templateSlug: 'online-course',
		name: 'Rascunho',
		audience: 'iniciantes',
		priceCents: 5_000,
		brand
	});
	const { offerId } = await publishedProduct(ctx, producer.id);

	for (const path of [
		`/p/${draft}`,
		'/p/not-a-uuid',
		`/p/${randomUUID()}`,
		// an offer of another product
		`/p/${draft}/checkout?offer=${offerId}`,
		`/orders/${randomUUID()}`
	]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
	}
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the checkout still creates the order', async ({ page, ctx, createUser }) => {
		const producer = await createUser('Paulo Lima');
		const { productId, offerId } = await publishedProduct(ctx, producer.id);
		await page.goto(`/p/${productId}/checkout?offer=${offerId}`);
		await checkout(page, 'Pix');
		await expect(page.getByRole('heading', { name: 'Falta só o pagamento' })).toBeVisible();
	});
});
