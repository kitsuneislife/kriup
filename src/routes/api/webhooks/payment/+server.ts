import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { ctx } from '#lib/server/app';
import { WebhookAuthError } from '#lib/server/payment/gateway';
import { handlePaymentEvent } from '#lib/server/services/payments';
import type { RequestHandler } from './$types';

// RF-22, RN-15. The provider retries on any non-2xx answer, so an unknown charge is
// acknowledged (it is not ours to retry) and a real failure answers 500 to be retried.
export const POST: RequestHandler = async ({ request }) => {
	let event;
	try {
		event = await ctx.payments.parseWebhook(request);
	} catch (err) {
		if (err instanceof WebhookAuthError) error(401);
		if (err instanceof ZodError || err instanceof SyntaxError) error(400);
		throw err;
	}
	if (event === null) return json({ outcome: 'ignored' });
	const outcome = await handlePaymentEvent(ctx, event);
	if (outcome === 'unknown_charge') console.warn('[webhook] unknown charge', event);
	return json({ outcome });
};
