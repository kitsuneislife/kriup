// UC-06, RF-61, RF-62: support blocks a producer's balance with a reason, the producer
// reads it on the money panel, support lifts it, and both actions are in the audit.

import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { createBlock } from '../src/lib/server/services/support';
import { expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

const reason = 'Contestação de pagamento em análise';
const nextStep = 'Envie o comprovante da venda ao suporte';

/** A name no other spec (or the other project running this one) uses, to find its rows. */
const unique = (name: string) => `${name} ${randomUUID().slice(0, 6)}`;

async function findPerson(page: Page, email: string) {
	await page.goto('/support/blocks');
	await hydrated(page);
	await page.getByLabel('E-mail da pessoa').fill(email);
	await page.getByRole('button', { name: 'Buscar' }).click();
	await expect(page).toHaveURL(/\?email=/);
}

test('support blocks a balance, the producer reads why, support lifts it and the audit shows both', async ({
	page,
	createUser,
	signIn
}) => {
	test.slow();
	const name = unique('Rui Teixeira');
	const producer = await createUser(name);
	const support = await createUser('Sara Dias', 'support');
	await signIn(support);

	await findPerson(page, producer.email);
	await expect(page.getByRole('heading', { name, level: 3 })).toBeVisible();
	await expect(page.getByLabel('O que bloquear')).toHaveValue('balance');
	await page.getByLabel('Motivo').fill(reason);
	await page.getByLabel('Como resolver').fill(nextStep);
	await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
	await expect(page.getByText('Bloqueio criado')).toBeVisible();
	const item = page.getByRole('listitem').filter({ hasText: producer.email });
	await expect(item).toContainText('Saldo');
	await expect(item).toContainText(`Motivo: ${reason}`);
	await expect(item).toContainText(`Para resolver: ${nextStep}`);
	await expect(item).toContainText('Por Sara Dias');
	await expectAccessible(page);

	await page.context().clearCookies();
	await signIn(producer);
	await page.goto('/producer/money');
	const alert = page.getByRole('alert').filter({ hasText: 'Saques bloqueados' });
	await expect(alert).toContainText(`Motivo: ${reason}`);
	await expect(alert).toContainText(`Para resolver: ${nextStep}`);

	await page.context().clearCookies();
	await signIn(support);
	await page.goto('/support/blocks');
	await hydrated(page);
	await page.getByRole('button', { name: `Desbloquear: Saldo de ${name}` }).click();
	await expect(page.getByText('Bloqueio retirado')).toBeVisible();
	await expect(page.getByRole('listitem').filter({ hasText: producer.email })).toHaveCount(0);

	await page.goto('/support/audit');
	await expect(page.getByRole('heading', { name: 'Auditoria', level: 1 })).toBeVisible();
	const trail = page.getByRole('list', { name: 'Ações do suporte' });
	await expect(trail).toContainText(`Desbloqueou: Saldo de ${name}`);
	await expect(trail).toContainText(`Bloqueou: Saldo de ${name}`);
	await expect(trail).toContainText(`Por Sara Dias · Motivo: ${reason}`);
	await expectAccessible(page);

	await page.context().clearCookies();
	await signIn(producer);
	await page.goto('/producer/money');
	await expect(page.getByRole('alert').filter({ hasText: 'Saques bloqueados' })).toHaveCount(0);
});

test('a blank reason is refused on the field and blocks nothing', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser(unique('Rui Teixeira'));
	await publishedProduct(ctx, producer.id, 10_000, 'Curso de pão');
	await signIn(await createUser('Sara Dias', 'support'));

	await findPerson(page, `ninguem.${randomUUID()}@e2e.test`);
	await expect(page.getByText('Nenhuma conta com este e-mail')).toBeVisible();

	await findPerson(page, producer.email);
	await page.getByLabel('O que bloquear').selectOption({ label: 'Produto: Curso de pão' });
	await page.getByLabel('Motivo').fill('   ');
	await page.getByLabel('Como resolver').fill(nextStep);
	await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
	await expect(page.getByText('Preencha este campo.')).toBeVisible();
	// what was typed stays, and nothing was blocked
	await expect(page.getByLabel('Como resolver')).toHaveValue(nextStep);
	await expect(page.getByLabel('O que bloquear')).toHaveValue(/^product:/);
	await expect(page.getByRole('listitem').filter({ hasText: producer.email })).toHaveCount(0);
	await expectAccessible(page);
});

test('anyone but support gets 404 on the blocks and the audit', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const support = await createUser('Sara Dias', 'support');
	const blockId = await createBlock(ctx, support.id, {
		userId: producer.id,
		target: 'balance',
		reason,
		nextStep
	});
	await signIn(producer);

	for (const path of ['/support/blocks', '/support/audit']) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
	}
	// a form posted straight to the action is refused too
	const post = await page.request.post('/support/blocks?/lift', {
		form: { blockId },
		headers: { origin: new URL(page.url()).origin }
	});
	expect(post.status()).toBe(404);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('support blocks and lifts a product', async ({ page, ctx, createUser, signIn }) => {
		const name = unique('Rui Teixeira');
		const producer = await createUser(name);
		await publishedProduct(ctx, producer.id, 10_000, 'Curso de pão');
		await signIn(await createUser('Sara Dias', 'support'));

		await page.goto('/support/blocks');
		await page.getByLabel('E-mail da pessoa').fill(producer.email);
		await page.getByRole('button', { name: 'Buscar' }).click();
		await page.getByLabel('O que bloquear').selectOption({ label: 'Produto: Curso de pão' });
		await page.getByLabel('Motivo').fill(reason);
		await page.getByLabel('Como resolver').fill(nextStep);
		await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
		await expect(page.getByText('Bloqueio criado')).toBeVisible();
		const item = page.getByRole('listitem').filter({ hasText: producer.email });
		await expect(item).toContainText('Produto Curso de pão');

		await page
			.getByRole('button', { name: `Desbloquear: Produto Curso de pão de ${name}` })
			.click();
		await expect(page.getByText('Bloqueio retirado')).toBeVisible();
		await expect(item).toHaveCount(0);
	});
});
