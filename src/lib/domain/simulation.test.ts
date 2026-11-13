import { describe, expect, it } from 'vitest';
import { parsePercent, simulateSale } from './simulation';

describe('simulateSale', () => {
	it('splits the net after the fee and sums to the gross', () => {
		// fee: 5% of 10000 = 500, plus 249 fixed; net 9251; coproducer 30% rounded down
		const sale = simulateSale(10_000, 3_000);
		expect(sale).toEqual({
			grossCents: 10_000,
			feeCents: 749,
			producerCents: 6_476,
			coproducerCents: 2_775
		});
		expect(sale.feeCents + sale.producerCents + sale.coproducerCents).toBe(10_000);
	});

	it('refuses a share over the limit', () => {
		expect(() => simulateSale(10_000, 9_500)).toThrow(RangeError);
	});
});

describe('parsePercent', () => {
	it.each([
		['30', 3_000],
		['12,5', 1_250],
		['7,25 %', 725],
		['90', 9_000],
		['0,01', 1]
	])('reads %s', (text, bp) => expect(parsePercent(text)).toBe(bp));

	it.each(['', 'abc', '0', '91', '100', '-5', '12.5', '12,555', '1e2'])('refuses %j', (text) =>
		expect(parsePercent(text)).toBeUndefined()
	);
});
