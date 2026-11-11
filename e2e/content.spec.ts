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

const lesson = (page: Page, title: string) =>
	page.locator('details').filter({ has: page.locator('summary', { hasText: title }) });

const section = (page: Page, title: string) =>
	page
		.locator('section')
		.filter({ has: page.getByRole('heading', { name: title, level: 2, exact: true }) });

const modules = async (ctx: Parameters<typeof getProductEditor>[0], producer: string, id: string) =>
	(await getProductEditor(ctx, producer, id)).modules.map((m) => ({
		title: m.title,
		lessons: m.lessons.map((l) => l.title)
	}));

test('builds the modules and lessons of a course', async ({ page, ctx, createUser, signIn }) => {
	test.slow(); // many saves and two axe checks
	const producer = await createUser('Paulo Lima');
	const id = await createProduct(ctx, producer.id, draft);
	await signIn(producer);
	await page.goto(`/producer/products/${id}`);
	await page.getByRole('link', { name: 'Conteúdo' }).click();
	await expect(page.getByRole('heading', { name: 'Conteúdo', level: 1 })).toBeVisible();
	await expectAccessible(page);

	// renames the first module the template drafted
	await section(page, 'Boas-vindas').getByLabel('Nome do módulo').fill('Primeiros passos');
	await section(page, 'Boas-vindas').getByRole('button', { name: 'Salvar nome' }).click();
	await expect(page.getByText('Nome salvo.')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Primeiros passos', level: 2 })).toBeVisible();

	// a lesson needs a title; with one it is added and the field empties
	const first = section(page, 'Primeiros passos');
	const newLesson = first.getByLabel('Nova aula em Primeiros passos');
	await first.getByRole('button', { name: 'Adicionar aula' }).click();
	await expect(newLesson).toHaveAccessibleDescription('Preencha este campo.');
	await newLesson.fill('A farinha certa');
	await first.getByRole('button', { name: 'Adicionar aula' }).click();
	await expect(lesson(page, 'A farinha certa')).toBeVisible();
	await expect(newLesson).toHaveValue('');

	// a link that is not https is refused on its field, and what was typed stays
	const flour = lesson(page, 'A farinha certa');
	await flour.locator('summary').click();
	await flour.getByLabel('Vídeo').fill('ftp://videos.example/farinha');
	await flour.getByLabel('Texto da aula').fill('Prefira farinha com 12% de proteína.');
	await flour.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(flour.getByText('Revise os campos destacados.')).toBeVisible();
	await expect(flour.getByLabel('Vídeo')).toHaveAccessibleDescription(
		/Informe o endereço completo, com https:\/\//
	);
	await expect(flour.getByLabel('Texto da aula')).toHaveValue(
		'Prefira farinha com 12% de proteína.'
	);
	await expectAccessible(page);

	await flour.getByLabel('Vídeo').fill('https://videos.example/farinha');
	await flour.getByRole('button', { name: 'Salvar aula' }).click();
	await expect(flour.getByText('Aula salva.')).toBeVisible();
	await expect(flour.locator('summary')).toContainText('Vídeo · Texto');

	// moving keeps the lesson open and the focus on it, so it can move again
	await flour.getByRole('button', { name: 'Subir aula' }).click();
	await expect(page.locator('summary').nth(1)).toContainText('A farinha certa');
	await expect(flour.getByRole('button', { name: 'Subir aula' })).toBeFocused();

	// a second module, then the first is deleted after the Dialog asks
	await page.getByLabel('Nome do novo módulo').fill('Bônus');
	await page.getByRole('button', { name: 'Adicionar módulo' }).click();
	await expect(page.getByRole('heading', { name: 'Bônus', level: 2 })).toBeVisible();
	await first.getByRole('button', { name: 'Apagar módulo' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toContainText('Apagar o módulo Primeiros passos?');
	await dialog.getByRole('button', { name: 'Apagar módulo' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('heading', { name: 'Primeiros passos' })).toBeHidden();

	expect((await modules(ctx, producer.id, id)).map((m) => m.title)).toEqual([
		'Fundamentos',
		'Próximos passos',
		'Bônus'
	]);
});

test("answers 404 for another producer's content", async ({ page, ctx, createUser, signIn }) => {
	const owner = await createUser('Paulo Lima');
	const id = await createProduct(ctx, owner.id, draft);
	await signIn(await createUser('Bia Rocha'));
	const response = await page.goto(`/producer/products/${id}/content`);
	expect(response?.status()).toBe(404);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('adds, moves and deletes', async ({ page, ctx, createUser, signIn }) => {
		const producer = await createUser('Paulo Lima');
		const id = await createProduct(ctx, producer.id, draft);
		await signIn(producer);
		await page.goto(`/producer/products/${id}/content`);
		const [first, second] = (await modules(ctx, producer.id, id))[0]!.lessons;

		await page.getByLabel('Nome do novo módulo').fill('Bônus');
		await page.getByRole('button', { name: 'Adicionar módulo' }).click();
		await expect(page.getByRole('heading', { name: 'Bônus', level: 2 })).toBeVisible();

		// a lesson opens natively; each answer is a new page, so it opens again
		const firstLesson = page.locator('details').first();
		await firstLesson.locator('summary').click();
		await firstLesson.getByRole('button', { name: 'Descer aula' }).click();
		await expect(firstLesson.locator('summary')).toContainText(second!);

		// without the Dialog the button deletes straight away
		await firstLesson.locator('summary').click();
		await firstLesson.getByRole('button', { name: 'Apagar aula' }).click();
		await expect(firstLesson.locator('summary')).toContainText(first!);

		const after = await modules(ctx, producer.id, id);
		expect(after[0]).toEqual({ title: 'Boas-vindas', lessons: [first] });
		expect(after.at(-1)).toEqual({ title: 'Bônus', lessons: [] });
	});
});
