// UC-07: the producer's money panel: a sale held with its release date, the daily job,
// a block with its reason and way out, a negative balance, and the access of other people.

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { ledgerEntry } from '../src/lib/server/db/schema';
import { releaseHeld } from '../src/lib/server/services/money';
import { createBlock } from '../src/lib/server/services/support';
import { days, db } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, publishedProduct, test } from './fixtures';

test('shows an empty state before the first sale', async ({ page, createUser, signIn }) => {
	await signIn(await createUser('Paulo Lima'));
	await page.goto('/producer/money');
	await expect(page.getByRole('heading', { name: 'Dinheiro', level: 1 })).toBeVisible();
	await expect(page.getByText('Nenhum dinheiro ainda')).toBeVisible();
	await expect(page.getByText(/saque mínimo é R\$\s50,00/)).toBeVisible();
	await expectAccessible(page);
});

test('a sale is held with its release date and the daily job releases it', async ({
	page,
	ctx,
	createUser,
	signIn
}, testInfo) => {
	test.slow();
	// the job releases every sale due, so only one project may run it
	test.skip(testInfo.project.name !== 'desktop');
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	// paid long ago, so the job below touches only this sale (other specs release their own
	// sales with releaseSalesOf, never with the job)
	const paidAt = new Date('2020-03-01T12:00:00Z');
	await buy(ctx, offerId, `bia.${randomUUID()}@e2e.test`, paidAt);
	await signIn(producer);

	await page.goto('/producer/money');
	await expect(page.getByText('Aguardando o fim da garantia')).toBeVisible();
	const releases = page.getByRole('list', { name: 'Próximas liberações' });
	await expect(releases).toContainText('8 de mar. de 2020');
	await expect(releases).toContainText('Garantia de compra: 1 venda');
	await expectAccessible(page);

	expect(await releaseHeld(ctx, days(paidAt, 8))).toBe(1);
	await page.reload();
	await expect(page.getByText('Nenhum valor retido agora.')).toBeVisible();
	await expect(page.getByRole('list', { name: 'Próximas liberações' })).toHaveCount(0);
	await expectAccessible(page);
});

test('an active block shows its reason and the way to resolve it', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser('Paulo Lima');
	const support = await createUser('Sara Dias', 'support');
	await createBlock(ctx, support.id, {
		userId: producer.id,
		target: 'balance',
		reason: 'Contestação de pagamento em análise',
		nextStep: 'Envie o comprovante da venda ao suporte'
	});
	await signIn(producer);

	await page.goto('/producer/money');
	const alert = page.getByRole('alert').filter({ hasText: 'Saques bloqueados' });
	await expect(alert).toContainText('Motivo: Contestação de pagamento em análise');
	await expect(alert).toContainText('Para resolver: Envie o comprovante da venda ao suporte');
	await expectAccessible(page);
});

test('a negative balance explains why no payout is possible', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const paidAt = new Date('2020-05-01T12:00:00Z');
	const orderId = await buy(ctx, offerId, `bia.${randomUUID()}@e2e.test`, paidAt);
	await db
		.update(ledgerEntry)
		.set({ state: 'released' })
		.where(eq(ledgerEntry.userId, producer.id));
	// the sale was refunded after its release, and the reversal is larger than what is left
	const sale = await db.query.ledgerEntry.findFirst({
		where: (e, { and, eq }) => and(eq(e.userId, producer.id), eq(e.orderId, orderId))
	});
	await db.insert(ledgerEntry).values({
		userId: producer.id,
		orderId,
		referenceId: sale!.id,
		type: 'reversal',
		state: 'released',
		amountCents: -sale!.amountCents - 2_000,
		reason: 'Reembolso de venda já liberada'
	});
	await signIn(producer);

	await page.goto('/producer/money');
	await expect(page.getByText('Saque indisponível: saldo negativo')).toBeVisible();
	await expect(page.getByText(/-R\$\s20,00/)).toBeVisible();
	await expectAccessible(page);
});

test("never shows another producer's money and sends a visitor to the login", async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const owner = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, owner.id);
	await buy(ctx, offerId, `bia.${randomUUID()}@e2e.test`);

	await page.goto('/producer/money');
	await expect(page).toHaveURL('/login');

	await signIn(await createUser('Bia Rocha'));
	await page.goto('/producer/money');
	await expect(page.getByText('Nenhum dinheiro ainda')).toBeVisible();
});
