import type { Page } from '@playwright/test';
import { createProduct, getProductEditor, updateProduct } from '../src/lib/server/services/catalog';
import { brand } from '../src/lib/server/services/testing';
import { expect, expectAccessible, hydrated, test } from './fixtures';

const draft = {
	templateSlug: 'online-course',
	name: 'Curso de pão',
	audience: 'iniciantes',
	priceCents: 9_700,
	brand
};

const save = (page: Page) => page.getByRole('button', { name: 'Salvar alterações' }).click();

/** Tabs switch on the client: a click before hydration does nothing, so retry it. */
async function openTab(page: Page, name: string) {
	const tab = page.getByRole('tab', { name });
	await expect(async () => {
		await tab.click();
		await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 500 });
	}).toPass();
}

test('shows what is missing and edits the basic data', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // two saves and three axe checks
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto(`/producer/products/${id}`);

	// a fresh draft from a template has everything it needs
	const checklist = page.getByRole('list', { name: 'Pendências para publicar' });
	await expect(page.getByText('4 de 4 prontos')).toBeVisible();
	await expect(checklist.getByRole('listitem')).toHaveCount(4);
	await expectAccessible(page);

	await openTab(page, 'Dados básicos');
	await page.getByLabel('Nome do produto').fill('Pão sem segredo');
	await page.getByLabel('Cor principal', { exact: true }).fill('#c2410c');
	await page.getByLabel('Fonte').selectOption('Lora');
	await page.getByLabel('Política de reembolso').fill('');
	await save(page);
	await expect(page.getByText('Alterações salvas.')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Pão sem segredo', level: 1 })).toBeVisible();
	await expectAccessible(page);

	// the change sticks, and the empty policy is now a pendency with a way to fix it
	await page.reload();
	await openTab(page, 'Resumo');
	await expect(page.getByText('3 de 4 prontos')).toBeVisible();
	await checklist.getByRole('link', { name: /Política de reembolso/ }).click();
	await expect(page.getByLabel('Cor principal', { exact: true })).toHaveValue('#c2410c');
	await expect(page.getByLabel('Fonte')).toHaveValue('Lora');
	await expect(page.getByLabel('Política de reembolso')).toHaveValue('');
});

test('refuses a wrong field under it and keeps what was typed', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // a refusal, an axe check and a reload
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto(`/producer/products/${id}?tab=data`);

	await page.getByLabel('Nome do produto').fill('  ');
	// a URL the browser accepts but the server does not
	await page.getByLabel('Endereço da logo').fill('ftp://example.com/logo.png');
	await save(page);
	await expect(page.getByLabel('Nome do produto')).toHaveAccessibleDescription(
		'Preencha este campo.'
	);
	await expect(page.getByLabel('Endereço da logo')).toHaveAccessibleDescription(
		'Informe o endereço completo, com https://.'
	);
	await expect(page.getByLabel('Endereço da logo')).toHaveValue('ftp://example.com/logo.png');
	await expectAccessible(page);

	await page.reload();
	await expect(page.getByRole('heading', { name: 'Curso de pão', level: 1 })).toBeVisible();
});

test('updates the brand preview live and copies the public sales link once published', async ({
	page,
	context,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	test.slow(); // publish + axe checks in both themes
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto(`/producer/products/${id}?tab=data`);
	await hydrated(page);

	const previewCard = page.locator('[data-variant="frame"]').filter({ hasText: 'Prévia da marca' });
	await expect(previewCard).toContainText('Curso de pão');

	// changing fields updates the brand preview immediately, before saving
	await page.getByLabel('Nome do produto').fill('Fornada artesanal');
	await page.getByLabel('Cor principal', { exact: true }).fill('#15803d');
	await page.getByLabel('Fonte').selectOption('Montserrat');
	await expect(previewCard).toContainText('Fornada artesanal');
	await expectAccessible(page);

	await openTab(page, 'Resumo');
	await page.getByRole('button', { name: 'Publicar produto' }).click();
	await expect(page.getByText('Seu produto está à venda.')).toBeVisible();
	await expect(page.getByLabel('Link da página de venda')).toHaveValue(`${baseURL}/p/${id}`);
	await page.getByRole('button', { name: 'Copiar link' }).click();
	await expect(page.getByRole('button', { name: 'Link copiado' })).toBeVisible();
	await expectAccessible(page);
});

test("refuses to save another producer's product", async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	const owner = await createUser('Paulo Lima');
	const id = await createProduct(ctx, owner.id, draft);
	await signIn(await createUser('Bia Rocha'));
	const response = await page.request.post(`/producer/products/${id}?/update`, {
		form: { name: 'Roubado', color: '#000000', font: 'Inter', logoUrl: '', refundPolicy: '' },
		headers: { origin: baseURL! }
	});
	expect(response.status()).toBe(404);
	const editor = await getProductEditor(ctx, owner.id, id);
	expect(editor.product.name).toBe('Curso de pão');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('reaches the form by link and saves', async ({ page, ctx, createUser, signIn }) => {
		const producer = await createUser('Paulo Lima');
		const id = await createProduct(ctx, producer.id, draft);
		await updateProduct(ctx, producer.id, id, { refundPolicy: '' });
		await signIn(producer);
		await page.goto(`/producer/products/${id}`);
		await page.getByRole('link', { name: /Política de reembolso/ }).click();
		await page.getByLabel('Nome do produto').fill('Pão sem segredo');
		await save(page);
		await expect(page.getByText('Alterações salvas.')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Pão sem segredo', level: 1 })).toBeVisible();
	});
});
