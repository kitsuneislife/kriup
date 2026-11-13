import { randomUUID } from 'node:crypto';
import {
	inviteCoproducer,
	listProductCoproductions
} from '../src/lib/server/services/coproduction';
import { expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

// R$ 100,00 sale: fee 5% + R$ 2,49 = R$ 7,49; net R$ 92,51; 30% to the coproducer rounded
// down = R$ 27,75; the producer keeps R$ 64,76.
const percentOf = /R\$\s*/;
const money = (text: string) => new RegExp(`${percentOf.source}${text}`);

test('simulates a sale, invites a coproducer and cancels the invite', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // several saves and axe in two themes
	const producer = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, producer.id);
	await signIn(producer);

	// the editor links to the screen
	await page.goto(`/producer/products/${productId}`);
	await page.getByRole('link', { name: /Coprodução/ }).click();
	await expect(page.getByRole('heading', { name: 'Coprodução', level: 1 })).toBeVisible();
	await expect(page.getByText('Nenhum convite ainda')).toBeVisible();
	await hydrated(page);
	await expectAccessible(page);

	// one sale, split
	const sim = page.getByRole('form', { name: 'Simulação' });
	await sim.getByLabel('Parte do coprodutor, em %').fill('30');
	await sim.getByRole('button', { name: 'Simular' }).click();
	await expect(page).toHaveURL(/percent=30/);
	const result = page.locator('main');
	await expect(result).toContainText(money('100,00'));
	await expect(result).toContainText(money('7,49'));
	await expect(result).toContainText(money('64,76'));
	await expect(result).toContainText(money('27,75'));

	// refusals land on their fields, and what was typed stays
	const invite = page.getByRole('form', { name: 'Novo convite' });
	await expect(invite.getByLabel('Percentual do coprodutor')).toHaveValue('30');
	await invite.getByLabel('Percentual do coprodutor').fill('95');
	await invite.getByLabel('E-mail do coprodutor').fill('rita@e2e.test');
	await invite.getByLabel('Nome do coprodutor').fill('Rita Souza');
	await invite.getByRole('button', { name: 'Enviar convite' }).click();
	await expect(invite.getByLabel('Percentual do coprodutor')).toHaveAccessibleDescription(
		/Informe o percentual de 0,01 a 90/
	);
	await expect(invite.getByLabel('E-mail do coprodutor')).toHaveValue('rita@e2e.test');

	await invite.getByLabel('Percentual do coprodutor').fill('30');
	await invite.getByLabel('E-mail do coprodutor').fill(producer.email);
	await invite.getByRole('button', { name: 'Enviar convite' }).click();
	await expect(invite.getByLabel('E-mail do coprodutor')).toHaveAccessibleDescription(
		'Você não pode ser coprodutor do seu próprio produto.'
	);

	// a valid invite shows up, with its status
	await invite.getByLabel('E-mail do coprodutor').fill('rita@e2e.test');
	await invite.getByLabel('Duração em dias').fill('90');
	await invite.getByRole('button', { name: 'Enviar convite' }).click();
	const row = page.getByRole('row', { name: /Rita Souza/ });
	await expect(row).toContainText('Aguardando aceite');
	await expect(row).toContainText('30%');
	await expect(row).toContainText('90 dias');
	await expect(invite.getByLabel('E-mail do coprodutor')).toHaveValue('');
	await expectAccessible(page);

	// the same person twice is refused on the e-mail
	await invite.getByLabel('E-mail do coprodutor').fill('rita@e2e.test');
	await invite.getByLabel('Nome do coprodutor').fill('Rita Souza');
	await invite.getByLabel('Percentual do coprodutor').fill('20');
	await invite.getByRole('button', { name: 'Enviar convite' }).click();
	await expect(invite.getByLabel('E-mail do coprodutor')).toHaveAccessibleDescription(
		'Esta pessoa já foi convidada para este produto.'
	);

	// canceling asks first
	await row.getByRole('button', { name: 'Cancelar convite' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Cancelar convite' }).click();
	await expect(page.getByRole('row', { name: /Rita Souza/ })).toContainText('Cancelada');
	await expect(page.getByRole('button', { name: 'Cancelar convite' })).toHaveCount(0);
});

test('fits a phone', async ({ page, ctx, createUser, signIn }) => {
	await page.setViewportSize({ width: 375, height: 800 });
	const producer = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, producer.id);
	await inviteCoproducer(ctx, producer.id, {
		productId,
		email: `rita.${randomUUID()}@e2e.test`,
		name: 'Rita Souza',
		percentBp: 2_500,
		durationDays: null
	});
	await signIn(producer);
	await page.goto(`/producer/products/${productId}/coproduction?percent=25`);
	await expect(page.getByRole('row', { name: /Rita Souza/ })).toContainText('Sem data final');
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
});

test("answers 404 for another producer's product and a malformed id", async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	const owner = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, owner.id);
	await signIn(await createUser('Bia Rocha'));
	for (const id of [productId, randomUUID(), 'not-a-uuid']) {
		expect((await page.goto(`/producer/products/${id}/coproduction`))?.status(), id).toBe(404);
		const post = await page.request.post(`/producer/products/${id}/coproduction?/invite`, {
			form: { email: 'x@e2e.test', name: 'X', percent: '10', durationDays: '' },
			headers: { origin: baseURL! }
		});
		expect(post.status(), id).toBe(404);
	}
	expect(await listProductCoproductions(ctx, owner.id, productId)).toEqual([]);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('simulates, invites and cancels', async ({ page, ctx, createUser, signIn }) => {
		const producer = await createUser('Paulo Lima');
		const { productId } = await publishedProduct(ctx, producer.id);
		await signIn(producer);
		await page.goto(`/producer/products/${productId}/coproduction`);

		await page.getByLabel('Parte do coprodutor, em %').fill('30');
		await page.getByRole('button', { name: 'Simular' }).click();
		await expect(page.locator('main')).toContainText(money('27,75'));

		const invite = page.getByRole('form', { name: 'Novo convite' });
		await invite.getByLabel('E-mail do coprodutor').fill('caio@e2e.test');
		await invite.getByLabel('Nome do coprodutor').fill('Caio Alves');
		await invite.getByRole('button', { name: 'Enviar convite' }).click();
		const row = page.getByRole('row', { name: /Caio Alves/ });
		await expect(row).toContainText('Aguardando aceite');

		await row.getByRole('button', { name: 'Cancelar convite' }).click();
		await expect(page.getByRole('row', { name: /Caio Alves/ })).toContainText('Cancelada');
	});
});
