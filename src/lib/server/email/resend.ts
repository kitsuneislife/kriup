// Resend HTTP adapter implementing Mailer (RF-22, decision D2).

import type { Mailer } from './mailer';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export interface ResendOptions {
	apiKey: string;
	from: string;
	fetchImpl?: typeof fetch;
}

export function resendMailer({ apiKey, from, fetchImpl = fetch }: ResendOptions): Mailer {
	return {
		send: async ({ to, subject, text }) => {
			const response = await fetchImpl(RESEND_EMAILS_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ from, to, subject, text })
			});
			if (!response.ok) {
				const detail = await response.text().catch(() => '');
				throw new Error(
					`Resend email delivery failed (${response.status})${detail ? `: ${detail}` : ''}`
				);
			}
		}
	};
}
