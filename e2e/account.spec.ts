import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { register } from '../src/lib/server/auth/accounts';
import { createPasswordToken, RESET_TOKEN_TTL_MS } from '../src/lib/server/auth/password-token';
import { findOrCreateAccount } from '../src/lib/server/users';
import { db } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

const password = 'pão quentinho';
const uniqueEmail = (name: string) => `${name}.${randomUUID()}@e2e.test`;
const areas = (page: Page) => page.getByRole('navigation', { name: 'Áreas' });

async function fillLogin(page: Page, email: string, secret: string) {
	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Senha').fill(secret);
	await page.getByRole('button', { name: 'Entrar' }).click();
}

test('signs up, signs out and signs back in', async ({ page }) => {
	// The longest journey of the suite: three screens and six axe passes. Alone it takes
	// about 8 s; with every worker on the one dev server it went past the 30 s default.
	test.slow();
	const email = uniqueEmail('ana');
	await page.goto('/register');
	await expectAccessible(page);
	await page.getByLabel('Nome').fill('Ana Souza');
	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Senha').fill(password);
	await page.getByRole('button', { name: 'Criar conta' }).click();

	await expect(page).toHaveURL('/producer');
	await areas(page).getByRole('link', { name: 'Ana Souza' }).click();
	await expect(areas(page).getByRole('link', { name: 'Ana Souza' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(page.getByRole('heading', { name: 'Conta', level: 1 })).toBeVisible();
	await expect(page.getByText(email)).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Sair' }).click();

	await expect(page).toHaveURL('/login');
	await page.goto('/producer');
	await expect(page).toHaveURL('/login');
	await expectAccessible(page);
	await fillLogin(page, email.toUpperCase(), password);
	await expect(page).toHaveURL('/producer');
});

test('refuses a wrong password and keeps the e-mail', async ({ page, createUser }) => {
	const user = await createUser('Ana Souza');
	await page.goto('/login');
	await fillLogin(page, user.email, 'senha errada');

	await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
	await expect(page.getByLabel('E-mail')).toHaveValue(user.email);
	await expectAccessible(page);
});

test('refuses an e-mail that has an account and a short password', async ({ page, createUser }) => {
	const user = await createUser('Ana Souza');
	await page.goto('/register');
	await page.getByLabel('Nome').fill('Ana');
	await page.getByLabel('E-mail').fill(user.email);
	await page.getByLabel('Senha').fill(password);
	await page.getByRole('button', { name: 'Criar conta' }).click();
	await expect(page.getByRole('alert')).toContainText('Já existe uma conta com este e-mail');

	await page.getByLabel('E-mail').fill(uniqueEmail('nova'));
	await page.getByLabel('Senha').fill('1234');
	await page.getByRole('button', { name: 'Criar conta' }).click();
	await expect(page.getByLabel('Senha')).toHaveAccessibleDescription(
		'Use pelo menos 8 caracteres.'
	);
	await expectAccessible(page);
});

test('sends a signed-in visitor from the login to their home', async ({
	page,
	createUser,
	signIn
}) => {
	await signIn(await createUser('Sara Dias', 'support'));
	await page.goto('/login');
	await expect(page).toHaveURL('/support');
});

test('redirects to a safe ?next= target on login and ignores unsafe ones', async ({
	page,
	ctx
}) => {
	const email = uniqueEmail('ana');
	await register(ctx, { name: 'Ana Souza', email, password });

	await page.goto('/login?next=%2Fproducer%2Fmoney');
	await fillLogin(page, email, password);
	await expect(page).toHaveURL('/producer/money');

	await page.context().clearCookies();
	await page.goto('/login?next=%2F%2Fevil.example');
	await fillLogin(page, email, password);
	await expect(page).toHaveURL('/producer');
});

test('edits the display name and switches the theme with persistence', async ({
	page,
	createUser,
	signIn
}) => {
	test.slow();
	await signIn(await createUser('Ana Souza'));
	await page.goto('/account');
	await hydrated(page);

	await expect(page.locator('html')).not.toHaveAttribute('data-theme');

	const nameInput = page.getByLabel('Seu nome');
	await nameInput.fill('   ');
	await page.getByRole('button', { name: 'Salvar nome' }).click();
	await expect(nameInput).toHaveAccessibleDescription('Preencha este campo.');
	await expect(nameInput).toHaveValue('   ');

	await nameInput.fill('Ana Clara');
	await page.getByRole('button', { name: 'Salvar nome' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Nome salvo.' })).toBeVisible();
	await expect(areas(page).getByRole('link', { name: 'Ana Clara' })).toBeVisible();

	await page.getByRole('radio', { name: 'Escuro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.getByRole('button', { name: 'Salvar tema' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Tema salvo.' })).toBeVisible();

	await page.reload();
	await hydrated(page);
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('radio', { name: 'Escuro' })).toBeChecked();

	await page.getByRole('radio', { name: 'Sistema' }).click();
	await expect(page.locator('html')).not.toHaveAttribute('data-theme');
	await page.getByRole('button', { name: 'Salvar tema' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Tema salvo.' })).toBeVisible();
	await page.reload();
	await hydrated(page);
	await expect(page.locator('html')).not.toHaveAttribute('data-theme');

	const overflows = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	);
	expect(overflows).toBe(false);
	await expectAccessible(page);
});

test('closes an account from the confirmation dialog and refuses a wrong password', async ({
	page,
	ctx
}) => {
	test.slow();
	const email = uniqueEmail('encerrar');
	await register(ctx, { name: 'Ana Souza', email, password });

	await page.goto('/login?next=%2Faccount');
	await fillLogin(page, email, password);
	await expect(page).toHaveURL('/account');
	await hydrated(page);

	await page.getByRole('button', { name: 'Encerrar conta' }).click();
	const dialog = page.getByRole('dialog', { name: 'Encerrar conta' });
	await expect(dialog).toBeVisible();
	await dialog.getByLabel('Confirme sua senha').fill('senha errada');
	await dialog.getByRole('button', { name: 'Encerrar minha conta' }).click();
	await expect(dialog.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
	await expectAccessible(page);

	await dialog.getByLabel('Confirme sua senha').fill(password);
	await dialog.getByRole('button', { name: 'Encerrar minha conta' }).click();
	await expect(page).toHaveURL('/login');

	await fillLogin(page, email, password);
	await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
});

test('asks for a recovery link without telling whether the account exists', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
	await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
	await expectAccessible(page);
	const email = uniqueEmail('ninguem');
	await page.getByLabel('E-mail').fill(email);
	await page.getByRole('button', { name: 'Enviar link' }).click();

	await expect(page.getByRole('status')).toContainText(`Se existir uma conta com ${email}`);
	await expectAccessible(page);
});

test('sets a new password from the link, once', async ({ page, createUser }) => {
	const user = await createUser('Ana Souza');
	const token = await createPasswordToken(db, user.id, RESET_TOKEN_TTL_MS);
	await page.goto(`/password/${token}`);
	await expect(page.getByRole('heading', { name: 'Nova senha' })).toBeVisible();
	await expect(page.getByText(user.email)).toBeVisible();
	await expectAccessible(page);
	await page.getByLabel('Nova senha').fill(password);
	await page.getByRole('button', { name: 'Salvar e entrar' }).click();
	await expect(page).toHaveURL('/producer');

	await page.goto(`/password/${token}`);
	await expect(page.getByRole('heading', { name: 'Link expirado' })).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Pedir um novo link' }).click();
	await expect(page).toHaveURL('/password/forgot');
});

test('shows an expired link as expired', async ({ page, createUser }) => {
	const user = await createUser('Ana Souza');
	const longAgo = new Date(Date.now() - 2 * RESET_TOKEN_TTL_MS);
	const token = await createPasswordToken(db, user.id, RESET_TOKEN_TTL_MS, longAgo);
	await page.goto(`/password/${token}`);

	await expect(page.getByRole('heading', { name: 'Link expirado' })).toBeVisible();
	await expect(page.getByLabel('Nova senha')).toHaveCount(0);
});

test('lets a buyer create the first password and opens their courses', async ({
	page,
	ctx,
	createUser
}) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const email = uniqueEmail('bia');
	await buy(ctx, offerId, email);
	const buyer = await findOrCreateAccount(db, email, 'Bia');
	const token = await createPasswordToken(db, buyer.id, RESET_TOKEN_TTL_MS);

	await page.goto(`/password/${token}`);
	await expect(page.getByRole('heading', { name: 'Crie sua senha' })).toBeVisible();
	await page.getByLabel('Senha').fill(password);
	await page.getByRole('button', { name: 'Salvar e entrar' }).click();
	await expect(page).toHaveURL('/student');
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('signs in and shows a refusal', async ({ page }) => {
		const email = uniqueEmail('ana');
		await page.goto('/register');
		await page.getByLabel('Nome').fill('Ana Souza');
		await page.getByLabel('E-mail').fill(email);
		await page.getByLabel('Senha').fill(password);
		await page.getByRole('button', { name: 'Criar conta' }).click();
		await expect(page).toHaveURL('/producer');

		await page.context().clearCookies();
		await page.goto('/login');
		await fillLogin(page, email, 'senha errada');
		await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
		await expect(page.getByLabel('E-mail')).toHaveValue(email);
	});

	test('edits account settings and closes the account via ?close=1 card', async ({ page, ctx }) => {
		const email = uniqueEmail('semjs');
		await register(ctx, { name: 'Ana Souza', email, password });

		await page.goto('/login?next=%2Faccount');
		await fillLogin(page, email, password);
		await expect(page).toHaveURL('/account');

		await page.getByLabel('Seu nome').fill('Ana Sem JS');
		await page.getByRole('button', { name: 'Salvar nome' }).click();
		await expect(page.getByRole('status')).toContainText('Nome salvo.');
		await expect(areas(page).getByRole('link', { name: 'Ana Sem JS' })).toBeVisible();

		await page.getByRole('radio', { name: 'Escuro' }).check({ force: true });
		await page.getByRole('button', { name: 'Salvar tema' }).click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await page.getByRole('link', { name: 'Encerrar conta' }).click();
		await expect(page).toHaveURL('/account?close=1');
		await expect(page.getByRole('heading', { name: 'Confirmar encerramento' })).toBeVisible();

		await page.getByLabel('Confirme sua senha').fill('errada');
		await page.getByRole('button', { name: 'Encerrar minha conta' }).click();
		await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');

		await page.getByLabel('Confirme sua senha').fill(password);
		await page.getByRole('button', { name: 'Encerrar minha conta' }).click();
		await expect(page).toHaveURL('/login');
	});
});
