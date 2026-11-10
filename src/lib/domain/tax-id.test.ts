import { describe, expect, it } from 'vitest';
import { normalizeTaxId } from './tax-id';

describe('normalizeTaxId', () => {
	it('accepts a valid CPF or CNPJ, with or without punctuation', () => {
		expect(normalizeTaxId('529.982.247-25')).toBe('52998224725');
		expect(normalizeTaxId('11.222.333/0001-81')).toBe('11222333000181');
	});

	it('rejects wrong check digits, repeated digits and other lengths', () => {
		expect(normalizeTaxId('529.982.247-24')).toBeNull();
		expect(normalizeTaxId('11.222.333/0001-80')).toBeNull();
		expect(normalizeTaxId('111.111.111-11')).toBeNull();
		expect(normalizeTaxId('123')).toBeNull();
	});
});
