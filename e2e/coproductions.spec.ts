// UC-09: the coproducer's invites and contract. The list with the pending ones first, the
// two-step accept and refuse, the domain error, the invitee who still has to set a password,
// the money of an accepted share, and the access of other people.

import { randomUUID } from 'node:crypto';
import { platformFee, splitSale } from '../src/lib/domain/split';
import type { Ctx } from '../src/lib/server/context';
import { acceptInvite, inviteCoproducer } from '../src/lib/server/services/coproduction';
import { days } from '../src/lib/server/services/testing';
import { formatMoney } from '../src/lib/ui/format';
import { buy, expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

const money = (cents: number) => formatMoney(cents).replace(/\s/g, ' ');

const invite = (
	ctx: Ctx,
	producerId: string,
	productId: string,
	to: { email: string; name: string },
	percentBp = 2_500,
	durationDays: number | null = 90
) => inviteCoproducer(ctx, producerId, { productId, ...to, percentBp, durationDays });

test('shows an empty list for someone never invited', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Carla Dias'));
	await page.goto('/coproductions');
	await expect(
		page.getByRole('heading', { name: 'Convites de coprodução', level: 1 })
	).toBeVisible();
	await expect(page.getByText('Nenhum convite ainda')).toBeVisible();
	await expectAccessible(page);
});

test('lists the invites with the pending ones first, and opens the contract', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const co = await createUser('Carla Dias');
	const bread = await publishedProduct(ctx, producer.id, 10_000, 'Curso de pão');
	const cake = await publishedProduct(ctx, producer.id, 10_000, 'Curso de bolo');
	const first = await invite(ctx, producer.id, bread.productId, co, 2_000, null);
	await acceptInvite(ctx, co.id, first);
	await invite(ctx, producer.id, cake.productId, co, 3_000, 30);
	await signIn(co);

	await page.goto('/producer');
	await page.getByRole('link', { name: 'Convites' }).click();
	const items = page.getByRole('listitem').filter({ hasText: 'Curso de' });
	await expect(items).toHaveCount(2);
	await expect(items.first()).toContainText('Curso de bolo');
	await expect(items.first()).toContainText('Convite pendente');
	await expect(items.first()).toContainText('30% do valor líquido · 30 dias a partir do aceite');
	await expect(items.last()).toContainText('Curso de pão');
	await expect(items.last()).toContainText('Em vigor');
	await expect(items.last()).toContainText('Sem data final');
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Ler e responder de Curso de bolo' }).click();
	await expect(
		page.getByRole('heading', { name: 'Você foi convidado para coproduzir', level: 1 })
	).toBeVisible();
	await expect(page.getByText('Contrato de coprodução, versão 1')).toBeVisible();
	await expect(page.getByText(/recebe 30% do valor líquido de cada venda/)).toBeVisible();
	await expectAccessible(page);
});

test('accepting asks for confirmation, then shows the acceptance and the statement link', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const co = await createUser('Carla Dias');
	const { productId } = await publishedProduct(ctx, producer.id);
	const id = await invite(ctx, producer.id, productId, co);
	await signIn(co);

	await page.goto(`/coproductions/${id}`);
	await hydrated(page);
	await page.getByRole('button', { name: 'Aceitar contrato' }).click();
	const dialog = page.getByRole('dialog', { name: 'Aceitar o contrato?' });
	await expect(dialog.getByText(/Você passa a receber 25%/)).toBeVisible();
	await expectAccessible(page);
	// going back writes nothing
	await dialog.getByRole('button', { name: 'Voltar' }).click();
	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole('heading', { name: 'Você foi convidado para coproduzir' })
	).toBeVisible();

	await page.getByRole('button', { name: 'Aceitar contrato' }).click();
	await dialog.getByRole('button', { name: 'Aceitar contrato' }).click();
	await expect(page.getByRole('heading', { name: 'Coprodução em vigor', level: 1 })).toBeVisible();
	await expect(page.getByText('Contrato aceito')).toBeVisible();
	await expect(page.getByText(/Aceito em .* na versão 1/)).toBeVisible();
	await expect(page.getByText(/Registro do aceite: [0-9a-f]{12}/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Aceitar contrato' })).toHaveCount(0);
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Ver a minha parte no extrato' }).click();
	await expect(page).toHaveURL('/producer/money/statement');
});

test('refusing cancels the invite for good', async ({ page, ctx, createUser, signIn }) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const co = await createUser('Carla Dias');
	const { productId } = await publishedProduct(ctx, producer.id);
	const id = await invite(ctx, producer.id, productId, co);
	await signIn(co);

	await page.goto(`/coproductions/${id}`);
	await hydrated(page);
	await page.getByRole('button', { name: 'Recusar convite' }).click();
	const dialog = page.getByRole('dialog', { name: 'Recusar o convite?' });
	await dialog.getByRole('button', { name: 'Recusar convite' }).click();
	await expect(
		page.getByRole('heading', { name: 'Este convite foi cancelado', level: 1 })
	).toBeVisible();
	await expect(page.getByText('Convite recusado')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Aceitar contrato' })).toHaveCount(0);
	await expectAccessible(page);
});

test('a share over the limit is refused with a translated message', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const first = await createUser('Ana Reis');
	const second = await createUser('Carla Dias');
	const { productId } = await publishedProduct(ctx, producer.id);
	await acceptInvite(ctx, first.id, await invite(ctx, producer.id, productId, first, 6_000));
	const id = await invite(ctx, producer.id, productId, second, 4_000);
	await signIn(second);

	await page.goto(`/coproductions/${id}`);
	await hydrated(page);
	await page.getByRole('button', { name: 'Aceitar contrato' }).click();
	await page
		.getByRole('dialog', { name: 'Aceitar o contrato?' })
		.getByRole('button', { name: 'Aceitar contrato' })
		.click();
	await expect(page.getByText('A soma das partes dos coprodutores passa do limite.')).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Você foi convidado para coproduzir' })
	).toBeVisible();
	await expectAccessible(page);
});

test('an invitee without a password sets one from the e-mail and finds the invite', async ({
	page,
	ctx,
	createUser
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, producer.id);
	const email = `novo.${randomUUID()}@e2e.test`;
	const id = await invite(ctx, producer.id, productId, { email, name: 'Novo Coprodutor' });
	const mail = ctx.mail.sent.at(-1)!;
	expect(mail.to).toBe(email);
	expect(mail.text).toContain(`/coproductions/${id}`);
	const passwordPath = new URL(/http\S+\/password\/\S+/.exec(mail.text)![0]).pathname;

	// the contract link alone sends a signed-out visitor to the login
	await page.goto(`/coproductions/${id}`);
	await expect(page).toHaveURL('/login');

	await page.goto(passwordPath);
	await page.getByLabel('Senha').fill('pão quentinho');
	await page.getByRole('button', { name: 'Salvar e entrar' }).click();
	await expect(page).toHaveURL('/coproductions');
	await expect(page.getByRole('listitem').filter({ hasText: 'Curso de pão' })).toContainText(
		'Convite pendente'
	);
	await page.getByRole('link', { name: 'Ler e responder de Curso de pão' }).click();
	await expect(page).toHaveURL(`/coproductions/${id}`);
});

test('UC-09: the coproducer sees the sale after the acceptance, and only that one', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const co = await createUser('Carla Dias');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	const id = await invite(ctx, producer.id, productId, co, 2_000, null);
	// paid before the acceptance: never divided
	await buy(ctx, offerId, 'antes@e2e.test', days(new Date(), -1));
	await signIn(co);

	await page.goto(`/coproductions/${id}`);
	await hydrated(page);
	await page.getByRole('button', { name: 'Aceitar contrato' }).click();
	await page
		.getByRole('dialog', { name: 'Aceitar o contrato?' })
		.getByRole('button', { name: 'Aceitar contrato' })
		.click();
	await expect(page.getByRole('heading', { name: 'Coprodução em vigor' })).toBeVisible();

	await buy(ctx, offerId, 'depois@e2e.test', new Date(Date.now() + 60_000));
	const fee = platformFee(10_000);
	const parts = splitSale(10_000, fee, [2_000]);

	await page.getByRole('link', { name: 'Ver a minha parte no extrato' }).click();
	const rows = page.getByRole('row').filter({ hasText: 'Curso de pão' });
	await expect(rows).toHaveCount(1);
	await expect(rows).toContainText(`Bruto ${money(10_000)}`);
	await expect(rows).toContainText(`taxa da plataforma ${money(fee)}`);
	await expect(rows).toContainText('Coprodução de 20%');
	await expect(rows).toContainText(`parte do produtor ${money(parts.producerCents)}`);
	await expect(rows).toContainText(money(parts.coproducerCents[0]!));
	await expectAccessible(page);
});

test('another account, the producer and a malformed id get 404', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const co = await createUser('Carla Dias');
	const { productId } = await publishedProduct(ctx, producer.id);
	const id = await invite(ctx, producer.id, productId, co);

	await signIn(await createUser('Rita Souza'));
	await page.goto('/coproductions');
	await expect(page.getByText('Nenhum convite ainda')).toBeVisible();
	for (const path of [
		`/coproductions/${id}`,
		`/coproductions/${randomUUID()}`,
		'/coproductions/nope'
	]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
	}
	// forms posted straight to the actions are refused too, and change nothing
	for (const action of ['accept', 'refuse']) {
		for (const target of [id, 'nope']) {
			const post = await page.request.post(`/coproductions/${target}?/${action}`, {
				form: {},
				headers: { origin: new URL(page.url()).origin }
			});
			expect(post.status(), `${action} ${target}`).toBe(404);
		}
	}

	// the producer reads the contract on the producer screens, not on this one
	await page.context().clearCookies();
	await signIn(producer);
	const response = await page.goto(`/coproductions/${id}`);
	expect(response?.status()).toBe(404);

	await page.context().clearCookies();
	await signIn(co);
	await page.goto(`/coproductions/${id}`);
	await expect(page.getByRole('button', { name: 'Aceitar contrato' })).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('accepting and refusing are confirmed on the page', async ({
		page,
		ctx,
		createUser,
		signIn
	}) => {
		const producer = await createUser('Paulo Lima');
		const co = await createUser('Carla Dias');
		const bread = await publishedProduct(ctx, producer.id, 10_000, 'Curso de pão');
		const cake = await publishedProduct(ctx, producer.id, 10_000, 'Curso de bolo');
		const toAccept = await invite(ctx, producer.id, bread.productId, co);
		const toRefuse = await invite(ctx, producer.id, cake.productId, co);
		await signIn(co);

		await page.goto(`/coproductions/${toAccept}`);
		await page.getByRole('link', { name: 'Aceitar contrato' }).click();
		await expect(page.getByRole('heading', { name: 'Confirmar aceite' })).toBeVisible();
		await page.getByRole('button', { name: 'Aceitar contrato' }).click();
		await expect(
			page.getByRole('heading', { name: 'Coprodução em vigor', level: 1 })
		).toBeVisible();

		await page.goto(`/coproductions/${toRefuse}`);
		await page.getByRole('link', { name: 'Recusar convite' }).click();
		await expect(page.getByRole('heading', { name: 'Confirmar recusa' })).toBeVisible();
		await page.getByRole('button', { name: 'Recusar convite' }).click();
		await expect(
			page.getByRole('heading', { name: 'Este convite foi cancelado', level: 1 })
		).toBeVisible();
	});
});
