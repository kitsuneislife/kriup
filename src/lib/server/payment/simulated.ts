import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { type Charge, type PaymentGateway, WebhookAuthError } from './gateway';

export const WEBHOOK_TOKEN_HEADER = 'x-webhook-token';

const eventSchema = z.object({
	type: z.enum(['paid', 'expired', 'declined', 'refunded']),
	externalId: z.string().min(1),
	amountCents: z.number().int().positive()
});

/**
 * Stand-in for the real provider (arquitetura.md): charges exist only as ids, and payment
 * happens when a webhook or the dev route reports it. Refunds are accepted at once.
 */
export function simulatedGateway(options: {
	appUrl: string;
	webhookToken: string;
}): PaymentGateway {
	const charge = (externalId: string): Charge => ({
		externalId,
		pix: { payload: `SIMULATED-PIX-${externalId}`, qrCodeImage: null },
		paymentUrl: new URL(`/dev/payments/${externalId}`, options.appUrl).href
	});

	return {
		createCharge: async ({ orderId }) => charge(`sim_${orderId}`),
		getCharge: async (externalId) => charge(externalId),
		refund: async () => {},
		parseWebhook: async (request) => {
			if (!sameToken(request.headers.get(WEBHOOK_TOKEN_HEADER), options.webhookToken)) {
				throw new WebhookAuthError('bad webhook token');
			}
			return eventSchema.parse(await request.json());
		}
	};
}

/** Constant-time comparison, so the token cannot be guessed byte by byte. */
export function sameToken(given: string | null, expected: string): boolean {
	if (given === null || expected === '') return false;
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}
