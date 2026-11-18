import { randomUUID } from 'node:crypto';
import { addOffer, createProduct } from '../src/lib/server/services/catalog';
import { brand } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, publishedProduct, test } from './fixtures';

const draft = {
	templateSlug: 'mentorship',
	name: 'Mentoria de fermentação',
	audience: 'padeiros',
	priceCents: 25_000,
	brand
};

test('leads a producer without products to the assistant', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Ana Souza'));
	await page.goto('/producer');

	await expect(page.getByText('Nenhum produto ainda')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Novo produto' })).toHaveCount(0);
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Criar meu primeiro produto' }).click();
	await expect(page).toHaveURL('/producer/new');
	await expect(page.getByRole('heading', { name: 'Novo produto', level: 1 })).toBeVisible();
});

test('lists the products newest first, with state, price and the next step', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // two products, two axe checks, and it ends on the editor
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id, 10_000);
	await addOffer(ctx, producer.id, productId, { name: 'Promoção', priceCents: 7_900 });
	await buy(ctx, offerId, `aluno.${randomUUID()}@e2e.test`);
	const draftId = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto('/producer');

	const cards = page.getByRole('listitem');
	await expect(cards).toHaveCount(2);
	await expect(cards.nth(0)).toContainText('Mentoria de fermentação');
	await expect(cards.nth(0)).toContainText('2 aulas · 0 vendas');
	await expect(cards.nth(0)).toContainText('Rascunho');
	await expect(cards.nth(0)).toContainText(/R\$\s250,00/);
	await expect(cards.nth(1)).toContainText('Curso de pão');
	await expect(cards.nth(1)).toContainText('5 aulas · 1 venda');
	await expect(cards.nth(1)).toContainText('Publicado');
	await expect(cards.nth(1)).toContainText(/a partir de\s*R\$\s79,00/);
	await expect(page.getByRole('link', { name: 'Novo produto' })).toBeVisible();
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Gerenciar de Curso de pão' }).click();
	await expect(page).toHaveURL(`/producer/products/${productId}`);
	await page.goto('/producer');
	await page.getByRole('link', { name: 'Continuar criação de Mentoria de fermentação' }).click();
	await expect(page).toHaveURL(`/producer/products/${draftId}`);
	await expect(page.getByRole('heading', { name: draft.name, level: 1 })).toBeVisible();
	await expectAccessible(page);
});

test("answers 404 to another producer's product and to a malformed id", async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const owner = await createUser('Paulo Lima');
	const id = await createProduct(ctx, owner.id, draft);
	await signIn(await createUser('Bia Rocha'));

	for (const path of [`/producer/products/${id}`, '/producer/products/not-a-uuid']) {
		const response = await page.goto(path);
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
		await expect(page.getByText(draft.name)).toHaveCount(0);
	}
	await page.goto('/producer');
	await expect(page.getByText('Nenhum produto ainda')).toBeVisible();
});
