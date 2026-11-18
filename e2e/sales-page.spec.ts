import type { Page } from '@playwright/test';
import { createProduct, getProductEditor } from '../src/lib/server/services/catalog';
import { brand } from '../src/lib/server/services/testing';
import { expect, expectAccessible, test } from './fixtures';

const draft = {
	templateSlug: 'online-course',
	name: 'Curso de pão',
	audience: 'iniciantes',
	priceCents: 9_700,
	brand
};

const section = (page: Page, name: string) =>
	page.locator('details').filter({ has: page.locator('summary', { hasText: name }) });

const save = (page: Page) => page.getByRole('button', { name: 'Salvar alterações' }).click();

test('edits texts, adds an image and moves a section', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // three saves and two axe checks
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto(`/producer/products/${id}`);
	await page.getByRole('link', { name: 'Página de venda' }).click();
	await expect(page.getByRole('heading', { name: 'Página de venda', level: 1 })).toBeVisible();
	await expectAccessible(page);

	// the opening section is open, the fields in reading order
	const hero = section(page, 'Abertura');
	await expect(hero.getByRole('textbox')).toHaveCount(5);
	await hero.getByLabel('Título', { exact: true }).fill('Pão sem segredo');

	const benefits = section(page, 'Benefícios');
	await benefits.locator('summary').click();
	await benefits.getByLabel('Imagem', { exact: true }).fill('https://img.example/pao.jpg');
	await save(page);
	// an image needs its description; nothing was saved
	await expect(page.getByText('Revise os campos destacados.')).toBeVisible();
	await expect(benefits.getByLabel('Descrição da imagem')).toHaveAccessibleDescription(
		'Preencha este campo.'
	);
	await expect(hero.getByLabel('Título', { exact: true })).toHaveValue('Pão sem segredo');
	await expectAccessible(page);

	await benefits.getByLabel('Descrição da imagem').fill('Um pão saindo do forno');
	await save(page);
	await expect(page.getByText('Alterações salvas.')).toBeVisible();

	// moving keeps the focus on the section that moved, so it can move again
	await page.getByRole('button', { name: 'Descer seção' }).first().click();
	await expect(page.locator('summary').first()).toContainText('Benefícios');
	await expect(hero.getByRole('button', { name: 'Descer seção' })).toBeFocused();

	const sales = (await getProductEditor(ctx, producer.id, id)).pages.sales.sections;
	expect(sales.map((s) => s.kind)).toEqual(['benefits', 'hero', 'guarantee', 'faq']);
	expect(sales[1]!.fields.title).toBe('Pão sem segredo');
	expect(sales[0]!.fields).toMatchObject({
		image: 'https://img.example/pao.jpg',
		imageAlt: 'Um pão saindo do forno'
	});
});

test('edits the checkout summary and the access e-mail', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // two saves and two axe checks
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto(`/producer/products/${id}/page`);

	const pagesNav = page.getByRole('navigation', { name: 'Páginas do produto' });
	await pagesNav.getByRole('link', { name: 'Checkout' }).click();
	await expect(page).toHaveURL(/type=checkout/);
	await expect(page.getByRole('heading', { name: 'Página de checkout', level: 1 })).toBeVisible();
	await expect(page.getByLabel('Imagem', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Descer seção' })).toHaveCount(0);

	const summary = section(page, 'Resumo da compra');
	await summary.getByLabel('Título', { exact: true }).fill('Resumo da sua inscrição');
	await summary.getByLabel('Observação').fill('Liberação imediata por Pix ou cartão.');
	await save(page);
	await expect(page.getByText('Alterações salvas.')).toBeVisible();
	await expectAccessible(page);

	await pagesNav.getByRole('link', { name: 'E-mail de acesso' }).click();
	await expect(page).toHaveURL(/type=access_email/);
	await expect(page.getByRole('heading', { name: 'E-mail de acesso', level: 1 })).toBeVisible();
	await expect(page.getByLabel('Imagem', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Subir seção' })).toHaveCount(0);

	const email = section(page, 'E-mail de acesso');
	await email.getByLabel('Assunto').fill('Bem-vindo à fornada');
	await email.getByLabel('Mensagem').fill('Seu acesso às aulas já está disponível.');
	await save(page);
	await expect(page.getByText('Alterações salvas.')).toBeVisible();
	await expectAccessible(page);

	const editor = await getProductEditor(ctx, producer.id, id);
	expect(editor.pages.checkout.sections).toEqual([
		{
			kind: 'summary',
			fields: {
				title: 'Resumo da sua inscrição',
				note: 'Liberação imediata por Pix ou cartão.'
			}
		}
	]);
	expect(editor.pages.access_email.sections).toEqual([
		{
			kind: 'email',
			fields: {
				subject: 'Bem-vindo à fornada',
				body: 'Seu acesso às aulas já está disponível.'
			}
		}
	]);
});

test("answers 404 for another producer's page", async ({ page, ctx, createUser, signIn }) => {
	const owner = await createUser('Paulo Lima');
	const id = await createProduct(ctx, owner.id, draft);
	await signIn(await createUser('Bia Rocha'));
	const response = await page.goto(`/producer/products/${id}/page`);
	expect(response?.status()).toBe(404);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('moves a section and keeps what was typed', async ({ page, ctx, createUser, signIn }) => {
		const producer = await createUser('Paulo Lima');
		const id = await createProduct(ctx, producer.id, draft);
		await signIn(producer);
		await page.goto(`/producer/products/${id}/page`);
		await section(page, 'Abertura').getByLabel('Título', { exact: true }).fill('Pão sem segredo');
		await page.getByRole('button', { name: 'Descer seção' }).first().click();
		await expect(page.getByText('Alterações salvas.')).toBeVisible();
		await expect(page.locator('summary').nth(1)).toContainText('Abertura');
		const sales = (await getProductEditor(ctx, producer.id, id)).pages.sales.sections;
		expect(sales[1]).toMatchObject({ kind: 'hero', fields: { title: 'Pão sem segredo' } });
	});
});
