import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { ASAAS_WEBHOOK_TOKEN_HEADER, asaasGateway, verifyAsaasToken } from './asaas';
import { WebhookAuthError } from './gateway';

type MockRoute = {
	status?: number;
	body?: unknown;
};

function mockFetch(routes: Record<string, MockRoute>) {
	const calls: { url: string; method: string; headers: Record<string, string>; body: unknown }[] =
		[];
	const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		const method = init?.method ?? 'GET';
		const headers = (init?.headers ?? {}) as Record<string, string>;
		const rawBody = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
		calls.push({ url, method, headers, body: rawBody });

		const key = `${method} ${url}`;
		const match = routes[key];
		if (!match) {
			return new Response(JSON.stringify({ errors: [{ description: `unmocked ${key}` }] }), {
				status: 404
			});
		}
		const text =
			match.body === undefined
				? ''
				: typeof match.body === 'string'
					? match.body
					: JSON.stringify(match.body);
		return new Response(text, { status: match.status ?? 200 });
	});
	return { fetchImpl, calls };
}

const sampleCustomer = {
	name: 'Bia Rocha',
	email: 'bia@example.com',
	taxId: '52998224725'
};

describe('verifyAsaasToken', () => {
	it('accepts an exact match and rejects missing, shorter, longer or utf-8 mismatched tokens without throwing', () => {
		expect(verifyAsaasToken('whsec_123456', 'whsec_123456')).toBe(true);
		expect(verifyAsaasToken(null, 'whsec_123456')).toBe(false);
		expect(verifyAsaasToken('', 'whsec_123456')).toBe(false);
		expect(verifyAsaasToken('whsec_123456', '')).toBe(false);
		expect(verifyAsaasToken('short', 'whsec_123456')).toBe(false);
		expect(verifyAsaasToken('whsec_123456_longer_token', 'whsec_123456')).toBe(false);
		expect(verifyAsaasToken('whsec_123457', 'whsec_123456')).toBe(false);
		expect(verifyAsaasToken('ação-secreta', 'whsec_123456')).toBe(false);
	});
});

describe('asaasGateway', () => {
	it('reuses an existing customer and creates a Pix charge with QR code and São Paulo dueDate', async () => {
		const { fetchImpl, calls } = mockFetch({
			'GET https://sandbox.asaas.com/api/v3/customers?email=bia%40example.com': {
				body: { data: [{ id: 'cus_existing' }, { id: 'cus_other' }] }
			},
			'POST https://sandbox.asaas.com/api/v3/payments': {
				body: {
					id: 'pay_pix_1',
					billingType: 'PIX',
					invoiceUrl: 'https://sandbox.asaas.com/i/pay_pix_1'
				}
			},
			'GET https://sandbox.asaas.com/api/v3/payments/pay_pix_1/pixQrCode': {
				body: {
					payload: '00020126580014br.gov.bcb.pix',
					encodedImage: 'iVBORw0KGgoAAAANSUhEUg=='
				}
			}
		});

		const gateway = asaasGateway({
			apiKey: 'asaas_key_test',
			baseUrl: 'https://sandbox.asaas.com/api/v3/',
			webhookToken: 'wh_secret',
			fetchImpl
		});

		// 01:30 UTC is still 22:30 of the previous day in America/Sao_Paulo (-03:00).
		const charge = await gateway.createCharge({
			orderId: 'ord_123',
			amountCents: 9_790,
			method: 'pix',
			description: 'Curso de pão',
			customer: sampleCustomer,
			dueAt: new Date('2026-11-18T01:30:00Z')
		});

		expect(charge).toEqual({
			externalId: 'pay_pix_1',
			paymentUrl: 'https://sandbox.asaas.com/i/pay_pix_1',
			pix: {
				payload: '00020126580014br.gov.bcb.pix',
				qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
			}
		});

		expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
			'GET https://sandbox.asaas.com/api/v3/customers?email=bia%40example.com',
			'POST https://sandbox.asaas.com/api/v3/payments',
			'GET https://sandbox.asaas.com/api/v3/payments/pay_pix_1/pixQrCode'
		]);
		expect(calls[0]?.headers.access_token).toBe('asaas_key_test');
		expect(calls[1]?.body).toEqual({
			customer: 'cus_existing',
			billingType: 'PIX',
			value: 97.9,
			dueDate: '2026-11-17',
			description: 'Curso de pão',
			externalReference: 'ord_123'
		});
	});

	it('creates a new customer when none matches and creates a credit-card charge with invoiceUrl', async () => {
		const { fetchImpl, calls } = mockFetch({
			'GET https://sandbox.asaas.com/api/v3/customers?email=bia%40example.com': {
				body: { data: [] }
			},
			'POST https://sandbox.asaas.com/api/v3/customers': {
				body: { id: 'cus_created' }
			},
			'POST https://sandbox.asaas.com/api/v3/payments': {
				body: {
					id: 'pay_card_1',
					billingType: 'CREDIT_CARD',
					invoiceUrl: 'https://sandbox.asaas.com/i/pay_card_1'
				}
			}
		});

		const gateway = asaasGateway({
			apiKey: 'asaas_key_test',
			webhookToken: 'wh_secret',
			fetchImpl
		});

		const charge = await gateway.createCharge({
			orderId: 'ord_456',
			amountCents: 19_900,
			method: 'card',
			description: 'Mentoria',
			customer: sampleCustomer,
			dueAt: new Date('2026-11-20T15:00:00Z')
		});

		expect(charge).toEqual({
			externalId: 'pay_card_1',
			paymentUrl: 'https://sandbox.asaas.com/i/pay_card_1',
			pix: null
		});
		expect(calls[1]?.body).toEqual({
			name: 'Bia Rocha',
			email: 'bia@example.com',
			cpfCnpj: '52998224725'
		});
		expect(calls[2]?.body).toMatchObject({
			customer: 'cus_created',
			billingType: 'CREDIT_CARD',
			value: 199,
			dueDate: '2026-11-20',
			externalReference: 'ord_456'
		});
	});

	it('fetches an existing charge and loads pixQrCode only when billingType is PIX', async () => {
		const { fetchImpl } = mockFetch({
			'GET https://sandbox.asaas.com/api/v3/payments/pay_pix_2': {
				body: {
					id: 'pay_pix_2',
					billingType: 'PIX',
					status: 'PENDING',
					invoiceUrl: 'https://sandbox.asaas.com/i/pay_pix_2'
				}
			},
			'GET https://sandbox.asaas.com/api/v3/payments/pay_pix_2/pixQrCode': {
				body: { payload: 'PIX-PAYLOAD', encodedImage: null }
			},
			'GET https://sandbox.asaas.com/api/v3/payments/pay_card_2': {
				body: {
					id: 'pay_card_2',
					billingType: 'CREDIT_CARD',
					status: 'PENDING',
					invoiceUrl: 'https://sandbox.asaas.com/i/pay_card_2'
				}
			}
		});

		const gateway = asaasGateway({
			apiKey: 'asaas_key_test',
			webhookToken: 'wh_secret',
			fetchImpl
		});

		await expect(gateway.getCharge('pay_pix_2')).resolves.toEqual({
			externalId: 'pay_pix_2',
			paymentUrl: 'https://sandbox.asaas.com/i/pay_pix_2',
			pix: { payload: 'PIX-PAYLOAD', qrCodeImage: null }
		});
		await expect(gateway.getCharge('pay_card_2')).resolves.toEqual({
			externalId: 'pay_card_2',
			paymentUrl: 'https://sandbox.asaas.com/i/pay_card_2',
			pix: null
		});
	});

	it('posts full refund and surfaces HTTP errors from Asaas', async () => {
		const { fetchImpl, calls } = mockFetch({
			'POST https://sandbox.asaas.com/api/v3/payments/pay_ok/refund': {
				status: 200,
				body: { id: 'pay_ok', status: 'REFUNDED' }
			},
			'POST https://sandbox.asaas.com/api/v3/payments/pay_fail/refund': {
				status: 400,
				body: { errors: [{ description: 'already refunded' }] }
			}
		});

		const gateway = asaasGateway({
			apiKey: 'asaas_key_test',
			webhookToken: 'wh_secret',
			fetchImpl
		});

		await expect(gateway.refund('pay_ok')).resolves.toBeUndefined();
		expect(calls[0]?.method).toBe('POST');
		await expect(gateway.refund('pay_fail')).rejects.toThrow(/400.*already refunded/);
	});

	it('verifies webhook token in constant time, maps every Asaas event, and ignores unknown events', async () => {
		const gateway = asaasGateway({
			apiKey: 'asaas_key_test',
			webhookToken: 'secret_webhook_token',
			fetchImpl: vi.fn()
		});

		const makeRequest = (body: unknown, token: string | null = 'secret_webhook_token') =>
			new Request('https://app.test/api/webhooks/payment', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					...(token !== null ? { [ASAAS_WEBHOOK_TOKEN_HEADER]: token } : {})
				},
				body: JSON.stringify(body)
			});

		await expect(
			gateway.parseWebhook(makeRequest({ event: 'PAYMENT_RECEIVED' }, null))
		).rejects.toBeInstanceOf(WebhookAuthError);
		await expect(
			gateway.parseWebhook(makeRequest({ event: 'PAYMENT_RECEIVED' }, 'short'))
		).rejects.toBeInstanceOf(WebhookAuthError);
		await expect(
			gateway.parseWebhook(
				makeRequest({ event: 'PAYMENT_RECEIVED' }, 'secret_webhook_token_extra_bytes')
			)
		).rejects.toBeInstanceOf(WebhookAuthError);

		const cases = [
			['PAYMENT_RECEIVED', 97.9, { type: 'paid', externalId: 'pay_1', amountCents: 9_790 }],
			['PAYMENT_CONFIRMED', 19.99, { type: 'paid', externalId: 'pay_1', amountCents: 1_999 }],
			['PAYMENT_OVERDUE', '150.00', { type: 'expired', externalId: 'pay_1', amountCents: 15_000 }],
			[
				'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
				49.9,
				{ type: 'declined', externalId: 'pay_1', amountCents: 4_990 }
			],
			[
				'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
				49.9,
				{ type: 'declined', externalId: 'pay_1', amountCents: 4_990 }
			],
			['PAYMENT_REFUNDED', 100, { type: 'refunded', externalId: 'pay_1', amountCents: 10_000 }]
		] as const;

		for (const [event, value, expected] of cases) {
			const parsed = await gateway.parseWebhook(
				makeRequest({ event, payment: { id: 'pay_1', value } })
			);
			expect(parsed, event).toEqual(expected);
		}

		await expect(
			gateway.parseWebhook(makeRequest({ event: 'PAYMENT_CREATED', payment: { id: 'pay_1' } }))
		).resolves.toBeNull();
		await expect(gateway.parseWebhook(makeRequest({ event: 'TRANSFER_DONE' }))).resolves.toBeNull();

		await expect(
			gateway.parseWebhook(
				makeRequest({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', value: 0 } })
			)
		).rejects.toBeInstanceOf(ZodError);
	});
});
