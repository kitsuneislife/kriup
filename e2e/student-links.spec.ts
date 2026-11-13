// The order card leads to the course and to a support ticket about that order.

import { buy, expect, publishedProduct, test } from './fixtures';

test('an order leads to its course and to the support', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const producer = await createUser('Paulo Lima');
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	await buy(ctx, offerId, student.email);
	await signIn(student);

	await page.goto('/student/orders');
	await page.getByRole('link', { name: /^Acessar curso/ }).click();
	await expect(page).toHaveURL(/\/student\/courses\//);

	await page.goto('/student/orders');
	await page.getByRole('link', { name: /^Falar com o suporte/ }).click();
	await expect(page).toHaveURL(/\/student\/tickets\/new\?order=/);
	const orderId = new URL(page.url()).searchParams.get('order');
	await expect(page.getByLabel('Sobre qual compra?')).toHaveValue(orderId!);
});
