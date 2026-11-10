// The payment provider seen by the app (arquitetura.md). The shape follows Asaas, the
// planned provider: a charge per order with the order id as external reference, Pix with
// a QR code, card on the provider's hosted page (card data never touches this server),
// and webhooks authenticated by a static token header. docs/tecnico/pagamentos.md maps
// each piece to the Asaas API.

export type PaymentMethod = 'pix' | 'card';

export interface ChargeRequest {
	/** Sent as the provider's external reference, so a charge always finds its order. */
	orderId: string;
	amountCents: number;
	method: PaymentMethod;
	description: string;
	customer: { name: string; email: string; taxId: string };
	/** Last day to pay; a Pix past it expires. */
	dueAt: Date;
}

export interface Charge {
	externalId: string;
	/** Pix copy-and-paste code; the QR image is a data URL when the provider sends one. */
	pix: { payload: string; qrCodeImage: string | null } | null;
	/** The provider's page for this charge; the card is typed there. */
	paymentUrl: string;
}

/** What a webhook reports, already translated from the provider's event names. */
export type PaymentEventType = 'paid' | 'expired' | 'declined' | 'refunded';

export interface PaymentEvent {
	type: PaymentEventType;
	externalId: string;
	amountCents: number;
}

export interface PaymentGateway {
	createCharge(request: ChargeRequest): Promise<Charge>;
	/** The same charge again, for a checkout page reloaded before paying. */
	getCharge(externalId: string): Promise<Charge>;
	/** Full refund of a paid charge; the provider confirms it later with a `refunded` event. */
	refund(externalId: string): Promise<void>;
	/**
	 * Authenticates a webhook request and reads it. Returns null for events the app does
	 * not act on; throws WebhookAuthError when the request is not from the provider.
	 */
	parseWebhook(request: Request): Promise<PaymentEvent | null>;
}

export class WebhookAuthError extends Error {
	override name = 'WebhookAuthError';
}
