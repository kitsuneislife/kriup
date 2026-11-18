import type { Page } from '@playwright/test';
import { createProduct, deleteOffer, getProductEditor } from '../src/lib/server/services/catalog';
import { brand } from '../src/lib/server/services/testing';
import { expect, expectAccessible, hydrated, test } from './fixtures';

const draft = {
	templateSlug: 'online-course',
	name: 'Curso de pão',
	audience: 'iniciantes',
	priceCents: 9_700,
	brand
};

const newOffer = (page: Page) => page.getByRole('form', { name: 'Nova oferta' });

const offerCard = (page: Page, name: string) =>
	page
		.locator('section')
		.filter({ has: page.getByRole('heading', { name, level: 2, exact: true }) });

test('edits the offers, then publishes once nothing is missing', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // many saves and two axe checks
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	const [drafted] = (await getProductEditor(ctx, producer.id, id)).offers;
	await deleteOffer(ctx, producer.id, drafted!.id);
	await signIn(producer);

	// without an offer the product cannot be published
	await page.goto(`/producer/products/${id}`);
	await expect(page.getByText('3 de 4 prontos')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Publicar produto' })).toBeDisabled();
	await page
		.getByRole('list', { name: 'Pendências para publicar' })
		.getByRole('link', { name: /Pelo menos uma oferta/ })
		.click();
	await expect(page.getByRole('heading', { name: 'Ofertas', level: 1 })).toBeVisible();
	await expect(page.getByText('Nenhuma oferta ainda')).toBeVisible();
	await expectAccessible(page);

	// a price that is not money is refused on its field, and the name stays
	const add = newOffer(page);
	await add.getByLabel('Nome da oferta').fill('À vista');
	await add.getByLabel('Preço em reais').fill('caro');
	await add.getByRole('button', { name: 'Adicionar oferta' }).click();
	await expect(add.getByLabel('Preço em reais')).toHaveAccessibleDescription(
		'Informe o valor em reais, como 97,90.'
	);
	await expect(add.getByLabel('Nome da oferta')).toHaveValue('À vista');

	await add.getByLabel('Preço em reais').fill('97,90');
	await add.getByRole('button', { name: 'Adicionar oferta' }).click();
	const card = offerCard(page, 'À vista');
	await expect(card).toBeVisible();
	await expect(card).toContainText('R$ 97,90');
	await expect(add.getByLabel('Nome da oferta')).toHaveValue('');

	// editing changes the price and the guarantee
	await card.getByText('Editar oferta').click();
	await card.getByLabel('Preço em reais').fill('120');
	await card.getByLabel('Garantia em dias').fill('30');
	await card.getByRole('button', { name: 'Salvar oferta' }).click();
	await expect(card.getByText('Oferta salva.')).toBeVisible();
	await expect(card).toContainText('Garantia de 30 dias');
	await expectAccessible(page);

	// back to the overview: nothing is missing, and publishing puts it on sale
	await page.getByRole('link', { name: 'Curso de pão' }).click();
	await expect(page.getByText('4 de 4 prontos')).toBeVisible();
	await page.getByRole('button', { name: 'Publicar produto' }).click();
	await expect(page.getByText('Seu produto está à venda.')).toBeVisible();
	await expect(page.getByText('Publicado', { exact: true })).toBeVisible();

	const editor = await getProductEditor(ctx, producer.id, id);
	expect(editor.product.status).toBe('published');
	expect(editor.offers.map((o) => [o.name, o.priceCents, o.guaranteeDays, o.recurrence])).toEqual([
		['À vista', 12_000, 30, 'one_time']
	]);
});

test('adds and edits monthly subscription offers', async ({ page, ctx, createUser, signIn }) => {
	test.slow(); // two saves and axe in both themes
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto(`/producer/products/${id}/offers`);
	await hydrated(page);

	const add = newOffer(page);
	await add.getByRole('radio', { name: 'Mensal' }).check();
	await add.getByLabel('Nome da oferta').fill('Plano mensal');
	await add.getByLabel('Preço em reais').fill('49,90');
	await add.getByRole('button', { name: 'Adicionar oferta' }).click();

	const monthlyCard = offerCard(page, 'Plano mensal');
	await expect(monthlyCard).toBeVisible();
	await expect(monthlyCard.locator('.header').getByText('Mensal', { exact: true })).toBeVisible();
	await expect(monthlyCard).toContainText('R$ 49,90');
	await expect(monthlyCard).toContainText('/mês');
	await expectAccessible(page);

	const mainCard = offerCard(page, 'Oferta principal');
	await expect(mainCard.locator('.header').getByText('Mensal', { exact: true })).toHaveCount(0);
	await mainCard.getByText('Editar oferta').click();
	await mainCard.getByRole('radio', { name: 'Mensal' }).check();
	await mainCard.getByRole('button', { name: 'Salvar oferta' }).click();
	await expect(mainCard.getByText('Oferta salva.')).toBeVisible();
	await expect(mainCard.locator('.header').getByText('Mensal', { exact: true })).toBeVisible();

	const editor = await getProductEditor(ctx, producer.id, id);
	expect(editor.offers.map((o) => [o.name, o.recurrence])).toEqual([
		['Oferta principal', 'monthly'],
		['Plano mensal', 'monthly']
	]);
});

test('refuses to publish with a pendency, whatever the screen sent', async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	const [drafted] = (await getProductEditor(ctx, producer.id, id)).offers;
	await deleteOffer(ctx, producer.id, drafted!.id);
	await signIn(producer);
	const response = await page.request.post(`/producer/products/${id}?/publish`, {
		form: {},
		headers: { origin: baseURL!, accept: 'application/json' }
	});
	expect(await response.json()).toMatchObject({ type: 'failure', status: 400 });
	expect((await getProductEditor(ctx, producer.id, id)).product.status).toBe('draft');
});

test("answers 404 for another producer's offers", async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	const owner = await createUser('Paulo Lima');
	const id = await createProduct(ctx, owner.id, draft);
	const [offer] = (await getProductEditor(ctx, owner.id, id)).offers;
	await signIn(await createUser('Bia Rocha'));
	expect((await page.goto(`/producer/products/${id}/offers`))?.status()).toBe(404);
	const response = await page.request.post(
		`/producer/products/${id}/offers?/deleteOffer&id=${offer!.id}`,
		{ form: {}, headers: { origin: baseURL! } }
	);
	expect(response.status()).toBe(404);
	expect((await getProductEditor(ctx, owner.id, id)).offers).toHaveLength(1);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('adds an offer and publishes', async ({ page, ctx, createUser, signIn }) => {
		const producer = await createUser('Paulo Lima');
		const id = await createProduct(ctx, producer.id, draft);
		await signIn(producer);
		await page.goto(`/producer/products/${id}/offers`);
		const add = newOffer(page);
		await add.getByLabel('Nome da oferta').fill('Parcelado');
		await add.getByLabel('Preço em reais').fill('150');
		await add.getByRole('button', { name: 'Adicionar oferta' }).click();
		await expect(offerCard(page, 'Parcelado')).toBeVisible();

		await page.goto(`/producer/products/${id}`);
		await page.getByRole('button', { name: 'Publicar produto' }).click();
		await expect(page.getByText('Seu produto está à venda.')).toBeVisible();
	});
});
