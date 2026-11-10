import { error, json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ctx } from '#lib/server/app';
import { order } from '#lib/server/db/schema';
import { handlePaymentEvent } from '#lib/server/services/payments';
import type { RequestHandler } from './$types';

const bodySchema = z.object({ outcome: z.enum(['paid', 'expired', 'declined']) });

// Development only: plays the provider for the simulated gateway, so the payment screen
// can be finished by hand. Production answers 404.
export const POST: RequestHandler = async ({ params, request }) => {
	if (!dev) error(404);
	const body = bodySchema.safeParse(await request.json().catch(() => null));
	if (!body.success) error(400);
	const [found] = await ctx.db
		.select({ grossCents: order.grossCents })
		.from(order)
		.where(eq(order.externalId, params.externalId));
	if (!found) error(404);
	const outcome = await handlePaymentEvent(ctx, {
		type: body.data.outcome,
		externalId: params.externalId,
		amountCents: found.grossCents
	});
	return json({ outcome });
};
