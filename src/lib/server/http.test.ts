import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DomainError } from '../domain/states';
import { act } from './http';

describe('act', () => {
	it('returns the value of a call that succeeds', async () => {
		expect(await act(async () => 42)).toEqual({ ok: true, value: 42 });
	});

	it('answers a refused rule with its code', async () => {
		const result = await act(async () => {
			throw new DomainError('refund_exists');
		});
		expect(result).toMatchObject({ status: 400, data: { code: 'refund_exists' } });
	});

	it('puts the first text of each invalid field under its path', async () => {
		const schema = z.object({ name: z.string().min(1), password: z.string().min(8).max(9) });
		const result = await act(async () => schema.parse({ name: '', password: '1234' }));
		expect(result).toMatchObject({
			status: 400,
			data: {
				code: 'invalid_input',
				fields: { name: 'Preencha este campo.', password: 'Use pelo menos 8 caracteres.' }
			}
		});
	});
});
