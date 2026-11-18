import { defineEnvVars } from '@sveltejs/kit/env';

const required = (name: string) => (value: string | undefined) => {
	if (!value) throw new Error(`${name} is not set`);
	return value;
};

const optional = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Postgres connection string',
		schema: required('DATABASE_URL')
	},
	APP_URL: {
		description: 'Public origin of the site, used in e-mail links (e.g. https://app.example.com)',
		schema: (value) => new URL(required('APP_URL')(value)).origin
	},
	PAYMENT_WEBHOOK_TOKEN: {
		description:
			'Shared secret the payment provider sends on every webhook (Asaas: asaas-access-token)',
		schema: required('PAYMENT_WEBHOOK_TOKEN')
	},
	JOBS_TOKEN: {
		description: 'Bearer token the scheduler sends to POST /api/jobs/daily',
		schema: required('JOBS_TOKEN')
	},
	ASAAS_API_KEY: {
		description: 'Optional Asaas API key; when unset, the simulated payment gateway is used',
		schema: optional
	},
	ASAAS_BASE_URL: {
		description: 'Optional Asaas API base URL (e.g. https://sandbox.asaas.com/api/v3)',
		schema: optional
	},
	RESEND_API_KEY: {
		description: 'Optional Resend API key; when unset, e-mails are logged instead of sent',
		schema: optional
	},
	EMAIL_FROM: {
		description: 'Optional sender address for outgoing e-mails (e.g. Cakto <noreply@example.com>)',
		schema: optional
	}
});
