import { describe, expect, it } from 'vitest';
import { offerForm } from './product-form';

describe('offerForm', () => {
	it('reads the price in reais and the guarantee in days', () => {
		expect(offerForm.parse({ name: ' À vista ', price: '97,90', guaranteeDays: '30' })).toEqual({
			name: 'À vista',
			priceCents: 9_790,
			guaranteeDays: 30
		});
	});

	it('puts each refusal on the field that was typed', () => {
		const result = offerForm.safeParse({ name: 'À vista', price: 'muito', guaranteeDays: '3' });
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((issue) => issue.path.join('.')).sort()).toEqual([
			'guaranteeDays',
			'price'
		]);
	});

	it('refuses an empty guarantee instead of reading it as zero', () => {
		const result = offerForm.safeParse({ name: 'À vista', price: '97', guaranteeDays: ' ' });
		expect(result.error?.issues[0]?.path).toEqual(['guaranteeDays']);
	});
});
