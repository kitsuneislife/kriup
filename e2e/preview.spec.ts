// RF-16: the producer sees the product as the student will, read-only; anyone else gets 404.

import { randomUUID } from 'node:crypto';
import { createProduct, deleteModule, getProductEditor } from '../src/lib/server/services/catalog';
import { brand } from '../src/lib/server/services/testing';
import { expect, expectAccessible, publishedProduct, test } from './fixtures';

test('shows the sales page and the course as the student sees them', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // two axe checks, each in two themes
	const producer = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, producer.id, 9_700, 'Curso de pão');
	await signIn(producer);

	await page.goto(`/producer/products/${productId}`);
	await page.getByRole('link', { name: 'Ver como o aluno vê' }).click();
	await expect(page).toHaveURL(`/producer/products/${productId}/preview`);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByText('Prévia: assim o aluno vê')).toBeVisible();
	// read-only: the offer shows its price and nothing to buy
	await expect(page.getByRole('heading', { name: 'Garanta seu acesso' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Comprar agora' })).toHaveCount(0);
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Conteúdo do curso' }).click();
	await expect(page).toHaveURL(/view=course/);
	await expect(page.getByRole('navigation', { name: 'Aulas do curso' })).toBeVisible();
	await expect(page.getByRole('button', { name: /concluída/i })).toHaveCount(0);
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Voltar ao editor' }).click();
	await expect(page).toHaveURL(`/producer/products/${productId}`);
});

test('previews checkout, access e-mail and monthly subscription offers read-only', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // three views checked with axe in both themes
	const producer = await createUser('Paulo Lima');
	const productId = await createProduct(ctx, producer.id, {
		templateSlug: 'subscription-club',
		name: 'Clube do pão',
		audience: 'padeiros',
		priceCents: 4_900,
		brand
	});
	await signIn(producer);

	await page.goto(`/producer/products/${productId}/preview`);
	await expect(page.getByText('Mensal', { exact: true })).toBeVisible();
	await expect(page.getByText('/mês')).toBeVisible();
	await expectAccessible(page);

	const switcher = page.getByRole('navigation', { name: 'O que visualizar' });
	await switcher.getByRole('link', { name: 'Checkout' }).click();
	await expect(page).toHaveURL(/view=checkout/);
	await expect(page.getByRole('heading', { name: 'Finalizar compra', level: 1 })).toBeVisible();
	await expect(page.getByText('Você está assinando Clube do pão')).toBeVisible();
	await expect(page.getByText('Mensal', { exact: true })).toBeVisible();
	await expect(page.getByText('/mês')).toBeVisible();
	await page.getByText('Política de reembolso').click();
	await expect(page.getByText(/reembolso da primeira cobrança de Clube do pão/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Gerar Pix' })).toHaveCount(0);
	await expectAccessible(page);

	await switcher.getByRole('link', { name: 'E-mail de acesso' }).click();
	await expect(page).toHaveURL(/view=email/);
	await expect(page.getByRole('heading', { name: 'E-mail de acesso', level: 1 })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Seu acesso ao clube Clube do pão está liberado' })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Acessar área de membros' })).toBeVisible();
	await expectAccessible(page);
});

test('without lessons, the course view leads to the content screen', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	// a draft: the preview works before publishing, which is its point
	const productId = await createProduct(ctx, producer.id, {
		templateSlug: 'online-course',
		name: 'Curso de pão',
		audience: 'iniciantes',
		priceCents: 9_700,
		brand
	});
	for (const m of (await getProductEditor(ctx, producer.id, productId)).modules) {
		await deleteModule(ctx, producer.id, m.id);
	}
	await signIn(producer);
	await page.goto(`/producer/products/${productId}/preview?view=course`);
	await expect(page.getByText(/ainda é um rascunho/)).toBeVisible();
	await page.getByRole('link', { name: 'Criar aulas' }).click();
	await expect(page).toHaveURL(`/producer/products/${productId}/content`);
});

test('fits a phone', async ({ page, ctx, createUser, signIn }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	const producer = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, producer.id);
	await signIn(producer);
	for (const view of ['', '?view=checkout', '?view=email', '?view=course']) {
		await page.goto(`/producer/products/${productId}/preview${view}`);
		await expect(page.getByText('Prévia: assim o aluno vê')).toBeVisible();
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
	}
});

test("answers 404 for another producer's product and a malformed id", async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const owner = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, owner.id);
	await signIn(await createUser('Bia Rocha'));
	for (const id of [productId, randomUUID(), 'not-a-uuid']) {
		expect((await page.goto(`/producer/products/${id}/preview`))?.status(), id).toBe(404);
	}
});
