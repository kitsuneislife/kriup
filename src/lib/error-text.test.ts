import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DOMAIN_ERROR_CODES } from './domain/states';
import { errorText, issueText } from './error-text';
import { checkoutSchema } from './server/services/checkout';

describe('errorText', () => {
	it('has its own sentence for every domain error code', () => {
		const texts = DOMAIN_ERROR_CODES.map((code) => [code, errorText(code)] as const);
		expect(texts.filter(([, text]) => !/^[A-ZÀ-Ú].+\.$/.test(text ?? ''))).toEqual([]);
		expect(new Set(texts.map(([, text]) => text)).size).toBe(texts.length);
	});

	it('shows the payout minimum in reais', () => {
		expect(errorText('below_minimum')).toBe('O saque mínimo é de R$ 50,00.');
	});

	it('explains why an account with open obligations cannot be closed', () => {
		expect(errorText('account_has_open_obligations')).toBe(
			'Resolva os saldos, saques, reembolsos ou bloqueios em aberto antes de encerrar a conta.'
		);
	});
});

describe('issueText', () => {
	it('explains a percentage that is not one', () => {
		const schema = z.string().superRefine((_, ctx) => {
			ctx.addIssue({ code: 'custom', message: 'x', params: { code: 'invalid_percent' } });
		});
		expect(schema.safeParse('abc').error!.issues.map(issueText)).toEqual([
			'Informe o percentual de 0,01 a 90, como 30 ou 12,5.'
		]);
	});

	const textFor = (schema: z.ZodType, value: unknown) => {
		const result = schema.safeParse(value);
		if (result.success) throw new Error('expected an issue');
		return issueText(result.error.issues[0]!);
	};

	it('asks to fill a missing or empty field', () => {
		expect(textFor(z.string(), undefined)).toBe('Preencha este campo.');
		expect(textFor(z.string().trim().min(1), '   ')).toBe('Preencha este campo.');
	});

	it('gives the length limits of a text', () => {
		expect(textFor(z.string().min(8), 'abc')).toBe('Use pelo menos 8 caracteres.');
		expect(textFor(z.string().max(3), 'abcd')).toBe('Use no máximo 3 caracteres.');
	});

	it('names the format that was expected', () => {
		expect(textFor(z.email(), 'ana')).toBe('Informe um e-mail válido.');
		expect(textFor(z.url(), 'site')).toBe('Informe o endereço completo, com https://.');
		expect(textFor(z.enum(['pix', 'card']), 'boleto')).toBe('Escolha uma das opções.');
	});

	it('translates custom rules by their code', () => {
		const shape = checkoutSchema.shape.taxId;
		expect(textFor(shape, '111.111.111-11')).toBe('CPF ou CNPJ inválido.');
		expect(
			textFor(
				z.string().refine(() => false),
				'x'
			)
		).toBe('Valor inválido.');
	});

	it('keeps numbers generic, since cents mean nothing to the person', () => {
		expect(textFor(z.number().min(500), 1)).toBe('Valor abaixo do mínimo.');
		expect(textFor(z.number().max(5), 9)).toBe('Valor acima do máximo.');
	});
});
