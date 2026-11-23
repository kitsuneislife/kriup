import { describe, expect, it, vi } from 'vitest';
import { resendMailer } from './resend';

describe('resendMailer', () => {
	it('posts the e-mail payload to Resend with Bearer authentication', async () => {
		const fetchImpl: typeof fetch = vi.fn(async () => {
			return new Response(JSON.stringify({ id: 're_123' }), { status: 200 });
		});

		const mailer = resendMailer({
			apiKey: 're_test_secret',
			from: 'Kriup <noreply@example.com>',
			fetchImpl
		});

		await mailer.send({
			to: 'bia@example.com',
			subject: 'Seu acesso ao curso',
			text: 'Olá, Bia! Defina sua senha.'
		});

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(fetchImpl).toHaveBeenCalledWith('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer re_test_secret',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'Kriup <noreply@example.com>',
				to: 'bia@example.com',
				subject: 'Seu acesso ao curso',
				text: 'Olá, Bia! Defina sua senha.'
			})
		});
	});

	it('throws an informative error when Resend responds with a non-2xx status', async () => {
		const fetchImpl: typeof fetch = vi.fn(async () => {
			return new Response('{"message":"Domain is not verified"}', { status: 403 });
		});

		const mailer = resendMailer({
			apiKey: 're_test_secret',
			from: 'Kriup <noreply@unverified.test>',
			fetchImpl
		});

		await expect(
			mailer.send({ to: 'bia@example.com', subject: 'Oi', text: 'Teste' })
		).rejects.toThrow(/403.*Domain is not verified/);
	});
});
