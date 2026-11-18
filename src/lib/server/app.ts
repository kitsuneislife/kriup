import {
	APP_URL,
	ASAAS_API_KEY,
	ASAAS_BASE_URL,
	EMAIL_FROM,
	PAYMENT_WEBHOOK_TOKEN,
	RESEND_API_KEY
} from '$app/env/private';
import type { Ctx } from './context';
import { db } from './db';
import { logMailer } from './email/mailer';
import { resendMailer } from './email/resend';
import { asaasGateway } from './payment/asaas';
import { simulatedGateway } from './payment/simulated';

/**
 * The app's context. Uses Asaas when `ASAAS_API_KEY` is configured (otherwise the
 * simulated gateway) and Resend when both `RESEND_API_KEY` and `EMAIL_FROM` are set
 * (otherwise console logging).
 */
export const ctx: Ctx = {
	db,
	appUrl: APP_URL,
	payments: ASAAS_API_KEY
		? asaasGateway({
				apiKey: ASAAS_API_KEY,
				baseUrl: ASAAS_BASE_URL,
				webhookToken: PAYMENT_WEBHOOK_TOKEN
			})
		: simulatedGateway({ appUrl: APP_URL, webhookToken: PAYMENT_WEBHOOK_TOKEN }),
	mail:
		RESEND_API_KEY && EMAIL_FROM
			? resendMailer({ apiKey: RESEND_API_KEY, from: EMAIL_FROM })
			: logMailer
};
