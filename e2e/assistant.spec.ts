import type { Page } from '@playwright/test';
import { expect, expectAccessible, test } from './fixtures';

const question = (page: Page, name: string) =>
	expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
const proceed = (page: Page) => page.getByRole('button', { name: 'Continuar' }).click();

test('asks one question per step and keeps the answers', async ({ page, createUser, signIn }) => {
	test.slow(); // six screens, three of them checked by axe
	await signIn(await createUser('Ana Souza'));
	await page.goto('/producer/new');

	const stepper = page.getByRole('list', { name: 'Etapas da criação' });
	await expect(stepper.locator('[aria-current="step"]')).toContainText('Tipo');
	await question(page, 'O que você vai vender?');
	await expectAccessible(page);
	await page.getByLabel('Tipo de produto').selectOption({ label: 'Curso' });
	await proceed(page);

	await question(page, 'Como se chama o produto?');
	await page.getByLabel('Nome do produto').fill('Pão de fermentação natural');
	await proceed(page);

	await question(page, 'Quanto vai custar?');
	await page.getByLabel('Preço em reais').fill('97,90');
	await proceed(page);

	await question(page, 'Para quem é?');
	await page.getByLabel('Público').fill('quem nunca fez pão em casa');
	await proceed(page);

	await question(page, 'Como é a sua marca?');
	await expect(stepper.locator('[aria-current="step"]')).toContainText('Marca');
	await expectAccessible(page);
	await page.getByLabel('Cor principal', { exact: true }).fill('#c2410c');
	await page.getByLabel('Fonte').selectOption('Lora');
	await page.getByLabel('Endereço da logo').fill('https://example.com/logo.png');
	await proceed(page);

	await question(page, 'Escolha um modelo');
	await expect(page.getByText('A escolha do modelo está chegando')).toBeVisible();
	await expectAccessible(page);

	// the answers survive a reload and going back
	await page.reload();
	await question(page, 'Escolha um modelo');
	await page.getByRole('button', { name: 'Voltar' }).click();
	await question(page, 'Como é a sua marca?');
	await expect(page.getByLabel('Cor principal', { exact: true })).toHaveValue('#c2410c');
	await expect(page.getByLabel('Fonte')).toHaveValue('Lora');
	await expect(page.getByLabel('Endereço da logo')).toHaveValue('https://example.com/logo.png');
});

test('refuses a wrong answer under its field', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Ana Souza'));
	await page.goto('/producer/new');
	await proceed(page);
	await proceed(page);
	await expect(page.getByLabel('Nome do produto')).toHaveAccessibleDescription(
		'Preencha este campo.'
	);
	await page.getByLabel('Nome do produto').fill('Pão de fermentação natural');
	await proceed(page);

	const price = page.getByLabel('Preço em reais');
	await price.fill('97.90');
	await proceed(page);
	await expect(price).toHaveAccessibleDescription('Informe o valor em reais, como 97,90.');
	await expect(price).toHaveValue('97.90');
	await expectAccessible(page);
	await price.fill('4,99');
	await proceed(page);
	await expect(price).toHaveAccessibleDescription('Valor abaixo do mínimo.');
	await price.fill('5');
	await proceed(page);
	await question(page, 'Para quem é?');
});

test('sends a signed-out visitor to the login', async ({ page }) => {
	await page.goto('/producer/new');
	await expect(page).toHaveURL('/login');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('moves forward, refuses and goes back', async ({ page, createUser, signIn }) => {
		await signIn(await createUser('Ana Souza'));
		await page.goto('/producer/new');
		await proceed(page);
		await page.getByLabel('Nome do produto').fill('Pão de fermentação natural');
		await proceed(page);

		await page.getByLabel('Preço em reais').fill('abc');
		await proceed(page);
		await expect(page.getByLabel('Preço em reais')).toHaveAccessibleDescription(
			'Informe o valor em reais, como 97,90.'
		);
		await page.getByRole('button', { name: 'Voltar' }).click();
		await expect(page.getByLabel('Nome do produto')).toHaveValue('Pão de fermentação natural');
	});
});
