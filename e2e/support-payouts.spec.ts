// RF-44, decision F2: support completes or declines the requested payouts, and the producer
// reads the outcome in the payout history. Other specs run in parallel on the same
// database, so each payout is found by its producer's unique e-mail.

import type { Page } from '@playwright/test';
import { SESSION_COOKIE, createSession, type SessionUser } from '../src/lib/server/auth/session';
import type { Ctx } from '../src/lib/server/context';
import { getBalance, requestPayout } from '../src/lib/server/services/money';
import { db, releaseSalesOf } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

const SUPPORT = '/support/payouts';
const HISTORY = '/producer/money/payouts';

/** A producer with one sale of R$ 300 already released. */
async function withReleasedBalance(ctx: Ctx, producer: SessionUser) {
	const { offerId } = await publishedProduct(ctx, producer.id, 30_000);
	await buy(ctx, offerId, `aluno.${producer.id}@e2e.test`);
	await releaseSalesOf(producer.id);
}

const card = (page: Page, producer: SessionUser) =>
	page.getByRole('listitem').filter({ hasText: producer.email });

test('support completes a payout and the producer sees it completed', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const support = await createUser('Sônia Dias', 'support');
	await withReleasedBalance(ctx, producer);

	// the producer asks for the payout on their screen
	await signIn(producer);
	await page.goto(HISTORY);
	await hydrated(page);
	await page.getByLabel('Quanto você quer sacar?').fill('100,00');
	await page.getByRole('button', { name: 'Sacar' }).click();
	await page
		.getByRole('dialog', { name: 'Confirmar saque' })
		.getByRole('button', { name: 'Confirmar saque' })
		.click();
	await expect(page.getByText('Em análise', { exact: true })).toBeVisible();

	await signIn(support);
	await page.goto(SUPPORT);
	await hydrated(page);
	const item = card(page, producer);
	await expect(item.getByText('Paulo Lima')).toBeVisible();
	await expect(item.getByText(/100,00/)).toBeVisible();
	await expect(item.getByText(/3,50/)).toBeVisible();
	await expect(item.getByText(/96,50/)).toBeVisible();
	await expectAccessible(page);

	await item.getByRole('button', { name: 'Concluir' }).click();
	const dialog = page.getByRole('dialog', { name: 'Concluir saque' });
	await expect(dialog.getByText(/96,50/)).toBeVisible();
	await expectAccessible(page);
	await dialog.getByRole('button', { name: 'Concluir saque' }).click();
	await expect(page.getByText('Saque concluído')).toBeVisible();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(card(page, producer)).toHaveCount(0);

	await signIn(producer);
	await page.goto(HISTORY);
	const history = page.getByRole('region', { name: 'Histórico de saques' });
	await expect(history.getByText('Concluído', { exact: true })).toBeVisible();
	await expect(history.getByText('Aguardando')).toHaveCount(0);
});

test('a decline needs a reason and gives the money back', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const support = await createUser('Sônia Dias', 'support');
	await withReleasedBalance(ctx, producer);
	const before = (await getBalance(db, producer.id)).releasedCents;
	await requestPayout(ctx, producer.id, 10_000);

	await signIn(support);
	await page.goto(SUPPORT);
	await hydrated(page);
	await card(page, producer).getByRole('button', { name: 'Recusar' }).click();
	const dialog = page.getByRole('dialog', { name: 'Recusar saque' });
	const reason = dialog.getByLabel('Motivo da recusa');

	// blank: the field says what is missing and the payout stays pending
	await reason.fill('   ');
	await dialog.getByRole('button', { name: 'Recusar saque' }).click();
	await expect(dialog.getByText('Preencha este campo.')).toBeVisible();
	await expectAccessible(page);
	expect((await getBalance(db, producer.id)).releasedCents).toBe(before - 10_000);

	await reason.fill('A conta bancária não confere com o titular.');
	await dialog.getByRole('button', { name: 'Recusar saque' }).click();
	await expect(page.getByText('Saque recusado')).toBeVisible();
	await expect(card(page, producer)).toHaveCount(0);
	expect((await getBalance(db, producer.id)).releasedCents).toBe(before);

	await signIn(producer);
	await page.goto(HISTORY);
	const history = page.getByRole('region', { name: 'Histórico de saques' });
	await expect(history.getByText('Recusado', { exact: true })).toBeVisible();
	await expect(
		history.getByText('Motivo: A conta bancária não confere com o titular.')
	).toBeVisible();
	await expect(history.getByText('voltou ao seu saldo liberado')).toBeVisible();
	await expectAccessible(page);
});

test('works without JavaScript: confirmation on the card', async ({
	browser,
	baseURL,
	ctx,
	createUser
}) => {
	const producer = await createUser('Paulo Lima');
	const support = await createUser('Sônia Dias', 'support');
	await withReleasedBalance(ctx, producer);
	await requestPayout(ctx, producer.id, 10_000);
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	const { token, expiresAt } = await createSession(db, support.id);
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

	await page.goto(SUPPORT);
	await card(page, producer).getByRole('link', { name: 'Recusar' }).click();
	await expect(page.getByRole('heading', { name: 'Recusar saque' })).toBeVisible();
	await page.getByLabel('Motivo da recusa').fill('   ');
	await page.getByRole('button', { name: 'Recusar saque' }).click();
	await expect(page.getByText('Preencha este campo.')).toBeVisible();

	await card(page, producer).getByRole('link', { name: 'Cancelar' }).click();
	await card(page, producer).getByRole('link', { name: 'Concluir' }).click();
	await expect(page.getByRole('heading', { name: 'Concluir saque' })).toBeVisible();
	await page.getByRole('button', { name: 'Concluir saque' }).click();
	await expect(page.getByText('Saque concluído')).toBeVisible();
	await expect(card(page, producer)).toHaveCount(0);
	await context.close();
});

test('answers 404 to anyone but support, and to a malformed id', async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	const producer = await createUser('Paulo Lima');
	await withReleasedBalance(ctx, producer);
	const id = await requestPayout(ctx, producer.id, 10_000);

	await signIn(producer);
	expect((await page.goto(SUPPORT))?.status()).toBe(404);
	const post = await page.request.post(`${SUPPORT}?/complete`, {
		form: { id },
		headers: { origin: baseURL! }
	});
	expect(post.status()).toBe(404);

	await signIn(await createUser('Sônia Dias', 'support'));
	const malformed = await page.request.post(`${SUPPORT}?/complete`, {
		form: { id: 'not-a-uuid' },
		headers: { origin: baseURL! }
	});
	expect(malformed.status()).toBe(404);
	expect((await getBalance(db, producer.id)).paidOutCents).toBe(0);
});
