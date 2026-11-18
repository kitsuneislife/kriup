// Asaas API v3 adapter implementing PaymentGateway (docs/tecnico/pagamentos.md, section 2).

import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
	type Charge,
	type PaymentEvent,
	type PaymentEventType,
	type PaymentGateway,
	WebhookAuthError
} from './gateway';

export const ASAAS_WEBHOOK_TOKEN_HEADER = 'asaas-access-token';
export const DEFAULT_ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3';

export interface AsaasOptions {
	apiKey: string;
	baseUrl?: string;
	webhookToken: string;
	fetchImpl?: typeof fetch;
}

const saoPauloDateParts = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/Sao_Paulo',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

function formatSaoPauloDate(date: Date): string {
	const parts = saoPauloDateParts.formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((p) => p.type === type)?.value ?? '';
	return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * Constant-time token comparison that pads to equal byte lengths before calling
 * `timingSafeEqual`, so unequal lengths never throw a RangeError.
 */
export function verifyAsaasToken(given: string | null, expected: string): boolean {
	if (given === null || expected === '') return false;
	const a = Buffer.from(given, 'utf8');
	const b = Buffer.from(expected, 'utf8');
	const length = Math.max(a.length, b.length, 1);
	const paddedA = Buffer.alloc(length);
	const paddedB = Buffer.alloc(length);
	a.copy(paddedA);
	b.copy(paddedB);
	const equal = timingSafeEqual(paddedA, paddedB);
	return equal && a.length === b.length;
}

const customerListSchema = z.object({
	data: z.array(z.object({ id: z.string().min(1) })).optional()
});

const customerSchema = z.object({
	id: z.string().min(1)
});

const paymentResponseSchema = z.object({
	id: z.string().min(1),
	billingType: z.string().optional(),
	status: z.string().optional(),
	invoiceUrl: z.string().min(1)
});

const pixQrCodeSchema = z.object({
	payload: z.string().min(1),
	encodedImage: z.string().nullable().optional()
});

const webhookEnvelopeSchema = z.object({
	event: z.string().min(1),
	payment: z.unknown().optional()
});

const webhookPaymentSchema = z.object({
	id: z.string().min(1),
	value: z.union([z.number(), z.string()]).transform((raw, issue) => {
		const num = Number(raw);
		const cents = Math.round(num * 100);
		if (!Number.isFinite(num) || !Number.isSafeInteger(cents) || cents <= 0) {
			issue.addIssue({ code: 'custom', message: 'invalid payment value' });
			return z.NEVER;
		}
		return cents;
	})
});

const EVENT_MAP: Record<string, PaymentEventType | undefined> = {
	PAYMENT_RECEIVED: 'paid',
	PAYMENT_CONFIRMED: 'paid',
	PAYMENT_OVERDUE: 'expired',
	PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'declined',
	PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'declined',
	PAYMENT_REFUNDED: 'refunded'
};

export function asaasGateway({
	apiKey,
	baseUrl = DEFAULT_ASAAS_BASE_URL,
	webhookToken,
	fetchImpl = fetch
}: AsaasOptions): PaymentGateway {
	const root = baseUrl.replace(/\/+$/, '');

	async function requestJson(method: string, path: string, body?: unknown): Promise<unknown> {
		const headers: Record<string, string> = {
			Accept: 'application/json',
			access_token: apiKey
		};
		if (body !== undefined) headers['Content-Type'] = 'application/json';

		const response = await fetchImpl(`${root}${path}`, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined
		});
		const text = await response.text();
		if (!response.ok) {
			throw new Error(
				`Asaas ${method} ${path} failed (${response.status})${text ? `: ${text}` : ''}`
			);
		}
		return text ? (JSON.parse(text) as unknown) : undefined;
	}

	async function findOrCreateCustomer(customer: {
		name: string;
		email: string;
		taxId: string;
	}): Promise<string> {
		const list = customerListSchema.parse(
			await requestJson('GET', `/customers?email=${encodeURIComponent(customer.email)}`)
		);
		const existing = list.data?.[0]?.id;
		if (existing) return existing;

		const created = customerSchema.parse(
			await requestJson('POST', '/customers', {
				name: customer.name,
				email: customer.email,
				cpfCnpj: customer.taxId
			})
		);
		return created.id;
	}

	async function fetchPix(paymentId: string): Promise<NonNullable<Charge['pix']>> {
		const qr = pixQrCodeSchema.parse(
			await requestJson('GET', `/payments/${encodeURIComponent(paymentId)}/pixQrCode`)
		);
		return {
			payload: qr.payload,
			qrCodeImage: qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null
		};
	}

	return {
		createCharge: async ({ orderId, amountCents, method, description, customer, dueAt }) => {
			const customerId = await findOrCreateCustomer(customer);
			const payment = paymentResponseSchema.parse(
				await requestJson('POST', '/payments', {
					customer: customerId,
					billingType: method === 'pix' ? 'PIX' : 'CREDIT_CARD',
					value: Number((amountCents / 100).toFixed(2)),
					dueDate: formatSaoPauloDate(dueAt),
					description,
					externalReference: orderId
				})
			);
			const pix = method === 'pix' ? await fetchPix(payment.id) : null;
			return {
				externalId: payment.id,
				paymentUrl: payment.invoiceUrl,
				pix
			};
		},

		getCharge: async (externalId) => {
			const payment = paymentResponseSchema.parse(
				await requestJson('GET', `/payments/${encodeURIComponent(externalId)}`)
			);
			const pix = payment.billingType === 'PIX' ? await fetchPix(payment.id) : null;
			return {
				externalId: payment.id,
				paymentUrl: payment.invoiceUrl,
				pix
			};
		},

		refund: async (externalId) => {
			await requestJson('POST', `/payments/${encodeURIComponent(externalId)}/refund`);
		},

		parseWebhook: async (request): Promise<PaymentEvent | null> => {
			if (!verifyAsaasToken(request.headers.get(ASAAS_WEBHOOK_TOKEN_HEADER), webhookToken)) {
				throw new WebhookAuthError('bad webhook token');
			}
			const envelope = webhookEnvelopeSchema.parse(await request.json());
			const type = EVENT_MAP[envelope.event];
			if (!type) return null;

			const payment = webhookPaymentSchema.parse(envelope.payment);
			return {
				type,
				externalId: payment.id,
				amountCents: payment.value
			};
		}
	};
}
