import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { resolve } from '$app/paths';
import { eq } from 'drizzle-orm';
import { ctx } from '#lib/server/app';
import { order, product } from '#lib/server/db/schema';
import { formText } from '#lib/server/http';
import type { Actions, PageServerLoad } from './$types';

// Development only: the simulated provider's payment page (payment/simulated.ts sends the
// buyer here). It reports the outcome through the dev API, like the provider's webhook would.

async function findOrder(externalId: string) {
	if (!dev) error(404);
	const [found] = await ctx.db
		.select({
			id: order.id,
			status: order.status,
			method: order.paymentMethod,
			grossCents: order.grossCents,
			productName: product.name
		})
		.from(order)
		.innerJoin(product, eq(product.id, order.productId))
		.where(eq(order.externalId, externalId));
	if (!found) error(404);
	return found;
}

export const load: PageServerLoad = async ({ params }) => ({
	order: await findOrder(params.externalId)
});

export const actions: Actions = {
	default: async ({ fetch, params, request }) => {
		const found = await findOrder(params.externalId);
		const outcome = formText(await request.formData(), 'outcome');
		const response = await fetch(`/api/dev/payments/${encodeURIComponent(params.externalId)}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ outcome })
		});
		if (!response.ok) error(response.status);
		redirect(303, resolve('/(public)/orders/[id]', { id: found.id }));
	}
};
