import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { check, productAnswers } from './wizard';

const types = ['course' as const, 'mentorship' as const];
const answers = {
	type: 'course',
	name: 'Pão de fermentação natural',
	price: '97,90',
	audience: 'quem nunca fez pão',
	color: '#0A8',
	font: 'Inter',
	logoUrl: ''
};

describe('check', () => {
	it('opens the first step before any answer', () => {
		expect(check({}, -1, types)).toEqual({ step: 0 });
	});

	it('opens the next step when every step so far is right', () => {
		expect(check(answers, 0, types)).toEqual({ step: 1 });
		expect(check(answers, 3, types)).toEqual({ step: 4 });
		expect(check(answers, 4, types)).toEqual({ step: 5 });
		expect(check(answers, 5, types)).toEqual({ step: 5 });
	});

	it('stops at the step with the wrong field and says why', () => {
		expect(check({ ...answers, price: '97.90' }, 2, types)).toEqual({
			step: 2,
			fields: { price: 'Informe o valor em reais, como 97,90.' }
		});
		expect(check({ ...answers, price: '4,99' }, 2, types)).toEqual({
			step: 2,
			fields: { price: 'Valor abaixo do mínimo.' }
		});
		expect(check({ ...answers, name: '  ' }, 1, types)).toEqual({
			step: 1,
			fields: { name: 'Preencha este campo.' }
		});
	});

	it('goes back to an earlier step that became wrong', () => {
		expect(check({ ...answers, name: '' }, 4, types).step).toBe(1);
	});

	it('takes only the types that have a template', () => {
		expect(check({ type: 'subscription' }, 0, types)).toEqual({
			step: 0,
			fields: { type: 'Escolha uma das opções.' }
		});
	});

	it('checks the brand: color, font and an optional logo address', () => {
		expect(check(answers, 4, types).fields).toBeUndefined();
		expect(check({ ...answers, color: 'azul', logoUrl: 'logo.png' }, 4, types)).toEqual({
			step: 4,
			fields: { color: 'Formato inválido.', logoUrl: 'Informe o endereço completo, com https://.' }
		});
	});
});

describe('productAnswers', () => {
	it('turns the typed answers into what createProduct takes', () => {
		expect(productAnswers(answers, types)).toEqual({
			type: 'course',
			name: 'Pão de fermentação natural',
			priceCents: 9_790,
			audience: 'quem nunca fez pão',
			brand: { color: '#00aa88', font: 'Inter', logoUrl: null }
		});
	});

	it('throws when a step is wrong', () => {
		expect(() => productAnswers({ ...answers, price: '4,99' }, types)).toThrow(ZodError);
	});
});
