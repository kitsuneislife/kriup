import type { Page } from '@playwright/test';
import { inviteCoproducer } from '../src/lib/server/services/coproduction';
import { requestRefund } from '../src/lib/server/services/refunds';
import { days } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, publishedProduct, test } from './fixtures';

const areas = (page: Page) => page.getByRole('navigation', { name: 'Áreas' });

test('sends a signed-out visitor to the login', async ({ page }) => {
	await page.goto('/producer');
	await expect(page).toHaveURL('/login');
});

test('shows a producer only the producer area', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Ana Souza'));
	await page.goto('/producer');

	await expect(page.getByRole('heading', { name: 'Produtos', level: 1 })).toBeVisible();
	await expect(areas(page).getByRole('link', { name: 'Produtos' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(areas(page).getByRole('link', { name: 'Ana Souza' })).toBeVisible();
	for (const other of ['Meus cursos', 'Convites', 'Fila']) {
		await expect(areas(page).getByRole('link', { name: other })).toHaveCount(0);
	}
	await expectAccessible(page);
});

test('adds the student and coproduction areas when the account has them', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const bia = await createUser('Bia Rocha');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	await buy(ctx, offerId, bia.email);
	await inviteCoproducer(ctx, producer.id, {
		productId,
		email: bia.email,
		name: bia.name,
		percentBp: 1_000,
		durationDays: null
	});
	await signIn(bia);
	await page.goto('/producer');

	await areas(page).getByRole('link', { name: 'Meus cursos' }).click();
	await expect(page.getByRole('heading', { name: 'Meus cursos', level: 1 })).toBeVisible();
	await expect(areas(page).getByRole('link', { name: 'Meus cursos' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await areas(page).getByRole('link', { name: 'Convites' }).click();
	await expect(page.getByRole('heading', { name: 'Convites de coprodução' })).toBeVisible();
	await expectAccessible(page);
});

test('shows live pending badges and brand in the sidebar without horizontal overflow', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const otherProducer = await createUser('Rita Souza');
	const student = await createUser('Bia Rocha');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const { productId: otherProductId } = await publishedProduct(ctx, otherProducer.id);

	const orderId = await buy(ctx, offerId, student.email, days(new Date(), -10));
	await requestRefund(ctx, student.id, { orderId, reason: 'Preciso cancelar.' });
	await inviteCoproducer(ctx, otherProducer.id, {
		productId: otherProductId,
		email: producer.email,
		name: producer.name,
		percentBp: 1_500,
		durationDays: null
	});

	await signIn(producer);
	await page.goto('/producer');

	await expect(page.getByRole('complementary').getByText('Cakto')).toBeVisible();
	await expect(areas(page).getByRole('link', { name: 'Reembolsos' })).toContainText('1');
	await expect(areas(page).getByRole('link', { name: 'Convites' })).toContainText('1');
	await expect(areas(page).getByRole('link', { name: 'Produtos' })).toHaveText('Produtos');

	const overflows = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	);
	expect(overflows).toBe(false);
	await expectAccessible(page);
});

test('opens the support area to support only', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Sara Dias', 'support'));
	await page.goto('/producer');
	await areas(page).getByRole('link', { name: 'Fila' }).click();
	await expect(page.getByRole('heading', { name: 'Fila do suporte' })).toBeVisible();
	await expectAccessible(page);
});

test('answers 404 to anyone else in the support area', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Ana Souza'));
	const response = await page.goto('/support');

	expect(response?.status()).toBe(404);
	await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
	await expect(page.getByText('Fila do suporte')).toHaveCount(0);
	await expectAccessible(page);
});

test('shows the error page for an unknown address', async ({ page }) => {
	const response = await page.goto('/no-such-page');

	expect(response?.status()).toBe(404);
	await expect(page).toHaveTitle('Página não encontrada');
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Ir para o início' }).click();
	await expect(page).toHaveURL('/login');
});
