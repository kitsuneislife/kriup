import { APP_URL, PAYMENT_WEBHOOK_TOKEN } from '$app/env/private';
import type { Ctx } from './context';
import { db } from './db';
import { logMailer } from './email/mailer';
import { simulatedGateway } from './payment/simulated';

/**
 * The app's context. Swapping the provider (Asaas) or the mailer (decision D2) happens
 * here and nowhere else; docs/tecnico/pagamentos.md lists what the Asaas adapter needs.
 */
export const ctx: Ctx = {
	db,
	appUrl: APP_URL,
	payments: simulatedGateway({ appUrl: APP_URL, webhookToken: PAYMENT_WEBHOOK_TOKEN }),
	mail: logMailer
};
