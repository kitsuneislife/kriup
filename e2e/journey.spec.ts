// The whole product across its three profiles, on the real screens: the producer signs up,
// creates a product with the assistant and publishes it; a student buys it through the
// checkout and the development payment simulator, watches a lesson and asks for a refund
// outside the guarantee; the producer lets the deadline pass; support decides; the money
// matches on every side. Only time travel (the order and the request are moved into the
// past, the daily job runs at the deadline) and the support account use the services.

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Page } from '@playwright/test';
import type { Ctx } from '../src/lib/server/context';
import { platformFee, splitSale } from '../src/lib/domain/split';
import { PLATFORM_FIXED_FEE_CENTS } from '../src/lib/domain/params';
import { order, refund } from '../src/lib/server/db/schema';
import { escalateOverdueRefunds } from '../src/lib/server/services/refunds';
import { VALID_CPF, days, db } from '../src/lib/server/services/testing';
import { formatMoney } from '../src/lib/ui/format';
import { expect, hydrated, test } from './fixtures';

const PRICE = 9_790;
const PASSWORD = 'pão quentinho';
const NET = splitSale(PRICE, platformFee(PRICE)).netCents;
const money = (cents: number) => formatMoney(cents).replace(/\s/g, ' ');

/** Signs up on the register screen; the new account lands on the producer home. */
async function register(page: Page, name: string, email: string) {
	await page.goto('/register');
	await page.getByLabel('Nome').fill(name);
	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Senha').fill(PASSWORD);
	await page.getByRole('button', { name: 'Criar conta' }).click();
	await expect(page).toHaveURL('/producer');
}

/** Signs in on the login screen. */
async function login(page: Page, email: string) {
	await page.context().clearCookies();
	await page.goto('/login');
	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Senha').fill(PASSWORD);
	await page.getByRole('button', { name: 'Entrar' }).click();
	await expect(page).not.toHaveURL('/login');
}

/** The assistant, then the editor: returns the id of the published product. */
async function createAndPublish(page: Page, name: string) {
	await page.goto('/producer/new');
	await hydrated(page);
	await page.getByLabel('Tipo de produto').selectOption({ label: 'Curso' });
	const next = () => page.getByRole('button', { name: 'Continuar' }).click();
	await next();
	await page.getByLabel('Nome do produto').fill(name);
	await next();
	await page.getByLabel('Preço em reais').fill('97,90');
	await next();
	await page.getByLabel('Público').fill('quem nunca fez pão em casa');
	await next();
	await next(); // the brand keeps its defaults
	await page.getByRole('button', { name: 'Criar com Curso online' }).click();
	await expect(page).toHaveURL(/\/producer\/products\/[0-9a-f-]{36}$/);
	const productId = page.url().split('/').at(-1)!;

	await expect(page.getByText('4 de 4 prontos')).toBeVisible();
	await page.getByRole('button', { name: 'Publicar produto' }).click();
	await expect(page.getByText('Seu produto está à venda.')).toBeVisible();
	return productId;
}

/** Buys as the signed-in student and pays with the simulator. */
async function buyAndPay(page: Page, productId: string) {
	await page.goto(`/p/${productId}`);
	await page.getByRole('link', { name: 'Comprar agora' }).click();
	await page.getByLabel('CPF ou CNPJ').fill(VALID_CPF);
	await page.getByRole('button', { name: 'Gerar Pix' }).click();
	await page.getByRole('link', { name: 'Abrir simulador' }).click();
	await page.getByRole('button', { name: 'Aprovar pagamento' }).click();
	await expect(page.getByRole('heading', { name: 'Pagamento confirmado' })).toBeVisible();
}

/**
 * The student asks for a refund on the screen; then the request is moved into the past, as
 * if opened five days ago and the producer never answered, and the daily job runs at its
 * deadline. Returns the refund id.
 */
async function askAndLetItExpire(page: Page, ctx: Ctx) {
	await page.goto('/student/orders');
	await page.getByRole('link', { name: 'Pedir reembolso' }).click();
	await expect(page.getByText('o produtor decide')).toBeVisible();
	await page.getByLabel('Por que você quer o reembolso?').fill('O curso não abre no meu celular.');
	await page.getByRole('button', { name: 'Pedir reembolso' }).click();
	await expect(
		page.getByRole('heading', { name: 'O produtor está analisando o seu pedido', level: 1 })
	).toBeVisible();
	const refundId = page.url().split('/').at(-1)!;

	const openedAt = days(new Date(), -5);
	await db
		.update(refund)
		.set({ openedAt, dueAt: days(openedAt, 3) })
		.where(eq(refund.id, refundId));
	await escalateOverdueRefunds(ctx, days(openedAt, 3));
	return refundId;
}

for (const outcome of ['approves', 'declines'] as const) {
	test(`journey: the producer never answers and support ${outcome}`, async ({
		page,
		ctx,
		createUser,
		signIn
	}) => {
		test.setTimeout(180_000); // three people, about twenty screens, one dev server
		const tag = randomUUID().slice(0, 6);
		const productName = `Pão de fermentação ${tag}`;
		const producerEmail = `paulo.${tag}@e2e.test`;
		const studentName = `Bia Rocha ${tag}`; // the support queue is shared by the specs
		const studentEmail = `bia.${tag}@e2e.test`;
		let productId = '';
		let refundId = '';

		await test.step('the producer signs up, creates the product and publishes it', async () => {
			await register(page, 'Paulo Lima', producerEmail);
			productId = await createAndPublish(page, productName);
			await page.goto('/producer');
			await expect(page.getByText(productName)).toBeVisible();
			await expect(page.getByText('Publicado')).toBeVisible();
		});

		await test.step('the student signs up, buys with Pix and opens the course', async () => {
			await page.context().clearCookies();
			await register(page, studentName, studentEmail);
			await buyAndPay(page, productId);
			await page.getByRole('link', { name: 'Ir para meus produtos' }).click();
			await expect(page.getByRole('heading', { name: productName, level: 2 })).toBeVisible();
			await page.getByRole('link', { name: `Começar: ${productName}` }).click();
			await page.getByRole('button', { name: 'Marcar como concluída' }).click();
			await expect(page.getByRole('button', { name: 'Concluída, desfazer' })).toBeVisible();
			// the sale is paid long ago, so the guarantee is over
			await db
				.update(order)
				.set({ paidAt: days(new Date(), -15) })
				.where(eq(order.productId, productId));
		});

		await test.step('the student asks for a refund and the producer does not answer', async () => {
			refundId = await askAndLetItExpire(page, ctx);
			await page.reload();
			await expect(
				page.getByRole('heading', { name: 'A plataforma está analisando o seu pedido' })
			).toBeVisible();
		});

		await test.step('the producer sees the deadline lost', async () => {
			await login(page, producerEmail);
			await page.goto(`/producer/refunds/${refundId}`);
			await expect(
				page.getByRole('heading', { name: 'O pedido foi para a plataforma', level: 1 })
			).toBeVisible();
			await expect(page.getByRole('button', { name: 'Aprovar reembolso' })).toHaveCount(0);
			await expect(page.getByRole('button', { name: 'Recusar reembolso' })).toHaveCount(0);
		});

		await test.step(`support ${outcome} the refund`, async () => {
			await page.context().clearCookies();
			await signIn(await createUser('Sara Dias', 'support'));
			await page.goto('/support');
			await page.getByRole('link', { name: `Decidir reembolso de ${studentName}` }).click();
			await hydrated(page);
			if (outcome === 'approves') {
				await page.getByRole('button', { name: 'Aprovar reembolso' }).click();
				await page
					.getByRole('dialog', { name: 'Aprovar reembolso?' })
					.getByRole('button', { name: 'Aprovar e devolver' })
					.click();
				await expect(
					page.getByRole('heading', { name: 'Reembolso concluído', level: 1 })
				).toBeVisible();
			} else {
				await page.getByLabel('Justificativa da recusa').fill('O acesso foi testado pela equipe.');
				await page.getByRole('button', { name: 'Recusar reembolso' }).click();
				await expect(
					page.getByRole('heading', { name: 'A plataforma recusou o pedido', level: 1 })
				).toBeVisible();
			}
		});

		await test.step('the student reads the decision and keeps or loses the course', async () => {
			await login(page, studentEmail);
			await page.goto(`/student/refunds/${refundId}`);
			await page.goto('/student/orders');
			if (outcome === 'approves') {
				await expect(page.getByText('Acesso encerrado')).toBeVisible();
				await page.goto('/student');
				await expect(page.getByRole('heading', { name: productName })).toHaveCount(0);
			} else {
				await expect(page.getByText('Acesso liberado')).toBeVisible();
				await page.goto('/student');
				await expect(page.getByRole('heading', { name: productName, level: 2 })).toBeVisible();
			}
		});

		await test.step('the producer money matches', async () => {
			await login(page, producerEmail);
			await page.goto('/producer/money');
			const panel = page.getByRole('main');
			if (outcome === 'approves') {
				// the sale is reversed; only the fixed fee, which the platform keeps, comes back
				await expect(panel).toContainText(`Retido ${money(0)}`);
				await expect(panel).toContainText(`${money(-PLATFORM_FIXED_FEE_CENTS)}`);
				await page.goto('/producer/money/statement');
				await expect(
					page.getByRole('region', { name: 'Extrato' }).getByText('Estornado')
				).toBeVisible();
			} else {
				await expect(panel).toContainText(`Retido ${money(NET)}`);
				await page.goto('/producer/money/statement');
				const row = page.getByRole('row').filter({ hasText: productName });
				await expect(row).toContainText(`Bruto ${money(PRICE)}`);
				await expect(row).toContainText(money(NET));
			}
		});
	});
}
