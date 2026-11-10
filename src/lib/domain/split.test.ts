import { describe, expect, it } from 'vitest';
import { splitSale } from './split';

describe('splitSale', () => {
	it('gives everything to the producer without a coproducer', () => {
		expect(splitSale(10_000, 749, 0)).toEqual({
			netCents: 9_251,
			coproducerCents: 0,
			producerCents: 9_251
		});
	});

	it('rounds the coproducer share down and gives the remainder to the producer', () => {
		// net 1001 * 33.33% = 333.633 -> 333
		expect(splitSale(1_001, 0, 3_333)).toEqual({
			netCents: 1_001,
			coproducerCents: 333,
			producerCents: 668
		});
	});

	it('always sums the parts to the net amount', () => {
		for (let gross = 0; gross <= 3_000; gross += 7) {
			for (const fee of [0, 249, gross]) {
				for (const bp of [0, 1, 3_333, 5_000, 9_000, 10_000]) {
					if (fee > gross) continue;
					const s = splitSale(gross, fee, bp);
					expect(s.coproducerCents + s.producerCents).toBe(s.netCents);
					expect(s.coproducerCents).toBeGreaterThanOrEqual(0);
					expect(s.producerCents).toBeGreaterThanOrEqual(0);
				}
			}
		}
	});

	it.each([
		[-1, 0, 0],
		[100, 101, 0],
		[100, 0, 10_001],
		[1.5, 0, 0]
	])('rejects invalid input (%d, %d, %d)', (gross, fee, bp) => {
		expect(() => splitSale(gross, fee, bp)).toThrow(RangeError);
	});
});
