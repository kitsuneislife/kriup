// UC-07 (RF-43, RF-53): the statement with the rule on each line, its filters in the URL,
// the coproducer's view and the privacy of other accounts.

import { platformFee, splitSale } from '../src/lib/domain/split';
import { acceptInvite, inviteCoproducer } from '../src/lib/server/services/coproduction';
import { releaseHeld } from '../src/lib/server/services/money';
import { days } from '../src/lib/server/services/testing';
import { formatMoney } from '../src/lib/ui/format';
import { buy, expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

const FEE = platformFee(10_000);
const NET = splitSale(10_000, FEE).netCents;
const money = (cents: number) => formatMoney(cents).replace(/\s/g, ' ');

test('shows a sale with the gross, the platform fee and the net', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	await buy(ctx, offerId, 'aluno@e2e.test');
	await signIn(producer);

	await page.goto('/producer/money/statement');
	await expect(page.getByRole('heading', { name: 'Extrato', level: 1 })).toBeVisible();
	const row = page.getByRole('row').filter({ hasText: 'Curso de pão' });
	await expect(row).toHaveCount(1);
	await expect(row).toContainText(`Bruto ${money(10_000)}`);
	await expect(row).toContainText(`taxa da plataforma ${money(FEE)}`);
	await expect(row).toContainText(money(NET));
	await expect(row).toContainText('Retido');
	await expect(row).toContainText('Liberado em');
	await expectAccessible(page);
});

test('filters narrow the list and survive a reload', async ({ page, ctx, createUser, signIn }) => {
	test.slow(); // several submits and an axe check
	const producer = await createUser('Paulo Lima');
	const bread = await publishedProduct(ctx, producer.id, 10_000, 'Curso de pão');
	const cake = await publishedProduct(ctx, producer.id, 20_000, 'Curso de bolo');
	const old = days(new Date(), -10);
	await buy(ctx, bread.offerId, 'um@e2e.test', old);
	await releaseHeld(ctx, new Date());
	await buy(ctx, cake.offerId, 'dois@e2e.test');
	await signIn(producer);

	await page.goto('/producer/money/statement');
	const rows = page.getByRole('row').filter({ hasText: 'Curso de' });
	await expect(rows).toHaveCount(2);

	await hydrated(page);
	await page.getByLabel('Produto').selectOption({ label: 'Curso de bolo' });
	await page.getByRole('button', { name: 'Filtrar' }).click();
	await expect(page).toHaveURL(new RegExp(`product=${cake.productId}`));
	await expect(rows).toHaveCount(1);
	await expect(rows).toContainText('Curso de bolo');

	await page.reload();
	await expect(rows).toHaveCount(1);
	await expect(page.getByLabel('Produto')).toHaveValue(cake.productId);

	await page.goto('/producer/money/statement?state=released');
	await expect(rows).toHaveCount(1);
	await expect(rows).toContainText('Curso de pão');
	await expect(rows).toContainText('Liberado');

	// the period is counted on the day of the entry in Sao Paulo (UTC-3)
	const day = (n: number) =>
		days(new Date(Date.now() - 3 * 3_600_000), n)
			.toISOString()
			.slice(0, 10);
	await page.goto(`/producer/money/statement?from=${day(0)}&to=${day(0)}`);
	await expect(rows).toHaveCount(2);
	await page.goto(`/producer/money/statement?from=${day(1)}`);
	await expect(page.getByText('Nenhum lançamento com esses filtros')).toBeVisible();
	await page.goto(`/producer/money/statement?to=${day(-1)}`);
	await expect(page.getByText('Nenhum lançamento com esses filtros')).toBeVisible();

	await page.goto('/producer/money/statement?state=reversed');
	await expect(page.getByText('Nenhum lançamento com esses filtros')).toBeVisible();
	await page.getByRole('link', { name: 'Limpar filtros' }).click();
	await expect(rows).toHaveCount(2);
	await expectAccessible(page);
});

test('a filter that makes no sense is ignored with a warning', async ({
	page,
	createUser,
	signIn
}) => {
	await signIn(await createUser('Paulo Lima'));
	const response = await page.goto(
		'/producer/money/statement?product=x&state=y&from=ontem&page=-1'
	);
	expect(response?.status()).toBe(200);
	await expect(page.getByText('Alguns filtros do endereço não são válidos')).toBeVisible();
	await expect(page.getByText('Nenhum lançamento ainda')).toBeVisible();
	await expectAccessible(page);
});

test('paginates a long statement keeping the filters', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // 21 purchases
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	for (let i = 0; i < 21; i++) await buy(ctx, offerId, `aluno${i}@e2e.test`);
	await signIn(producer);

	await page.goto('/producer/money/statement?state=held');
	const rows = page.getByRole('row').filter({ hasText: 'Curso de pão' });
	await expect(rows).toHaveCount(20);
	await page.getByRole('link', { name: 'Próxima' }).click();
	await expect(page).toHaveURL(/state=held.*page=2|page=2.*state=held/);
	await expect(rows).toHaveCount(1);
	await expect(page.getByRole('link', { name: 'Próxima' })).toHaveCount(0);
	await page.getByRole('link', { name: 'Anterior' }).click();
	await expect(rows).toHaveCount(20);
});

test('the coproducer sees their line with the percentage and the producer part', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const coproducer = await createUser('Carla Dias');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	const invite = await inviteCoproducer(ctx, producer.id, {
		productId,
		email: coproducer.email,
		name: coproducer.name,
		percentBp: 2_000,
		durationDays: null
	});
	await acceptInvite(ctx, coproducer.id, invite);
	await buy(ctx, offerId, 'aluno@e2e.test', new Date(Date.now() + 60_000));
	const parts = splitSale(10_000, FEE, [2_000]);

	await signIn(coproducer);
	await page.goto('/producer/money/statement');
	const row = page.getByRole('row').filter({ hasText: 'Curso de pão' });
	await expect(row).toHaveCount(1);
	await expect(row).toContainText(`Bruto ${money(10_000)}`);
	await expect(row).toContainText('Coprodução de 20%');
	await expect(row).toContainText(`parte do produtor ${money(parts.producerCents)}`);
	await expect(row).toContainText(money(parts.coproducerCents[0]!));
	await expectAccessible(page);
});

test("another account never sees someone else's lines", async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	await buy(ctx, offerId, 'aluno@e2e.test');
	await signIn(await createUser('Outra Pessoa'));

	// the product id of someone else filters nothing in, and is not offered as an option
	await page.goto(`/producer/money/statement?product=${productId}`);
	await expect(page.getByText('Curso de pão')).toHaveCount(0);
	await expect(page.getByText('Nenhum lançamento com esses filtros')).toBeVisible();

	await page.goto('/producer/money/statement');
	await expect(page.getByText('Nenhum lançamento ainda')).toBeVisible();
});
