// UC-07, RF-44, RF-45: the payout screen. A released balance, the fee before the
// confirmation, the history, the amount errors, a block and the access of other people.

import type { Page } from '@playwright/test';
import { SESSION_COOKIE, createSession, type SessionUser } from '../src/lib/server/auth/session';
import type { Ctx } from '../src/lib/server/context';
import { ledgerEntry, payout } from '../src/lib/server/db/schema';
import { getBalance } from '../src/lib/server/services/money';
import { createBlock } from '../src/lib/server/services/support';
import { db, releaseSalesOf } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

/** A producer with one sale of R$ 300 already released; returns its balance in cents. */
async function withReleasedBalance(ctx: Ctx, producer: SessionUser) {
	const { offerId } = await publishedProduct(ctx, producer.id, 30_000);
	await buy(ctx, offerId, `aluno.${producer.id}@e2e.test`);
	await releaseSalesOf(producer.id);
	return (await getBalance(db, producer.id)).releasedCents;
}

const PAGE = '/producer/money/payouts';

async function ask(page: Page, amount: string) {
	await page.getByLabel('Quanto você quer sacar?').fill(amount);
	await page.getByRole('button', { name: 'Sacar' }).click();
}

test('shows the fee before confirming and the payout enters the history', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	await withReleasedBalance(ctx, producer);
	await signIn(producer);

	await page.goto(PAGE);
	await hydrated(page);
	await expect(page.getByText('Nenhum saque ainda')).toBeVisible();
	await expectAccessible(page);

	await ask(page, '100,00');
	const dialog = page.getByRole('dialog', { name: 'Confirmar saque' });
	await expect(dialog.getByText('Taxa de saque')).toBeVisible();
	await expect(dialog.getByText(/3,50/)).toBeVisible();
	await expect(dialog.getByText(/96,50/)).toBeVisible();
	await expectAccessible(page);
	// nothing was written yet
	await expect(page.getByText('Nenhum saque ainda')).toBeVisible();

	await dialog.getByRole('button', { name: 'Confirmar saque' }).click();
	await expect(page.getByText('Saque solicitado')).toBeVisible();
	const history = page.getByRole('region', { name: 'Histórico de saques' });
	await expect(history.getByText('Em análise')).toBeVisible();
	await expect(history.getByText(/96,50/)).toBeVisible();
	await expectAccessible(page);
});

test('works without JavaScript: preview step, then confirm', async ({
	browser,
	baseURL,
	ctx,
	createUser
}) => {
	const producer = await createUser('Paulo Lima');
	await withReleasedBalance(ctx, producer);
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	const { token, expiresAt } = await createSession(db, producer.id);
	await context.addCookies([
		{
			name: SESSION_COOKIE,
			value: token,
			url: baseURL!,
			httpOnly: true,
			sameSite: 'Lax',
			expires: expiresAt.getTime() / 1000
		}
	]);
	const page = await context.newPage();

	await page.goto(PAGE);
	await ask(page, '100,00');
	await expect(page.getByRole('heading', { name: 'Confirmar saque' })).toBeVisible();
	await expect(page.getByText('Taxa de saque')).toBeVisible();
	await page.getByRole('button', { name: 'Confirmar saque' }).click();
	await expect(page.getByText('Saque solicitado')).toBeVisible();
	await expect(page.getByText('Em análise', { exact: true })).toBeVisible();
	await context.close();
});

test('refuses an amount below the minimum or above the balance on the field', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	await withReleasedBalance(ctx, producer);
	await signIn(producer);
	await page.goto(PAGE);
	await hydrated(page);

	await ask(page, '10,00');
	await expect(page.getByText('O saque mínimo é de')).toBeVisible();
	await expect(page.getByRole('dialog')).toHaveCount(0);

	await ask(page, '9.999,00');
	await expect(page.getByText('O valor passa do seu saldo liberado.')).toBeVisible();

	await ask(page, 'abc');
	await expect(page.getByText('Informe o valor em reais')).toBeVisible();
	await expectAccessible(page);
});

test('an active block prevents the payout and shows its reason', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const support = await createUser('Sônia Dias', 'support');
	await withReleasedBalance(ctx, producer);
	await createBlock(ctx, support.id, {
		userId: producer.id,
		target: 'balance',
		reason: 'Documento do titular pendente.',
		nextStep: 'Envie o documento pelo chamado.'
	});
	await signIn(producer);

	await page.goto(PAGE);
	await expect(page.getByText('Documento do titular pendente.')).toBeVisible();
	await expect(page.getByText('Envie o documento pelo chamado.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sacar' })).toHaveCount(0);
	await expectAccessible(page);
});

test('a negative balance prevents the payout and says why', async ({
	page,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	// a payout already spent more than the account holds: the released balance is negative
	const [spent] = await db
		.insert(payout)
		.values({ userId: producer.id, amountCents: 5_000, feeCents: 350 })
		.returning({ id: payout.id });
	await db.insert(ledgerEntry).values({
		userId: producer.id,
		payoutId: spent!.id,
		type: 'payout',
		state: 'released',
		amountCents: -1_000,
		reason: 'Saque solicitado'
	});
	await signIn(producer);
	await page.goto(PAGE);
	await expect(page.getByText('Seu saldo está negativo').first()).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sacar' })).toHaveCount(0);
});

test('sends a visitor to the login and shows only the own history', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	await page.goto(PAGE);
	await expect(page).toHaveURL(/\/login/);

	const other = await createUser('Outra Pessoa');
	await withReleasedBalance(ctx, other);
	await signIn(await createUser('Paulo Lima'));
	await page.goto(PAGE);
	await expect(page.getByText('Nenhum saque ainda')).toBeVisible();
});
