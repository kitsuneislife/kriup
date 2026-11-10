import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MAX_CENTS } from './money';
import { platformFee, splitRefund, splitSale } from './split';

const sum = (parts: number[]) => parts.reduce((a, b) => a + b, 0);

/** Coproducer shares whose total respects RN-12. */
const shares = fc.oneof(
	fc.array(fc.integer({ min: 0, max: 3_000 }), { maxLength: 3 }),
	fc.integer({ min: 0, max: 9_000 }).map((bp) => [bp])
);

/** A sale as the system records it: gross at least the fee it is charged. */
const sale = fc
	.integer({ min: 300, max: MAX_CENTS })
	.map((gross) => ({ gross, fee: platformFee(gross) }))
	.filter(({ gross, fee }) => fee <= gross);

describe('platformFee', () => {
	it('charges 5% half up plus R$ 2,49 (RN-02)', () => {
		expect(platformFee(10_000)).toBe(749);
		expect(platformFee(9_990)).toBe(749); // 499.5 -> 500
		expect(platformFee(0)).toBe(249);
	});
});

describe('splitSale', () => {
	it('gives everything to the producer without a coproducer', () => {
		expect(splitSale(10_000, 749)).toEqual({
			netCents: 9_251,
			producerCents: 9_251,
			coproducerCents: []
		});
	});

	it('rounds each coproducer share down and gives the remainder to the producer', () => {
		// net 1001: 33.33% = 333.63 -> 333; 25% = 250.25 -> 250
		expect(splitSale(1_001, 0, [3_333, 2_500])).toEqual({
			netCents: 1_001,
			producerCents: 418,
			coproducerCents: [333, 250]
		});
	});

	it('always sums the parts to the net, with no negative part (RN-05)', () => {
		fc.assert(
			fc.property(sale, shares, ({ gross, fee }, bps) => {
				const s = splitSale(gross, fee, bps);
				expect(s.netCents).toBe(gross - fee);
				expect(s.producerCents + sum(s.coproducerCents)).toBe(s.netCents);
				expect(Math.min(s.producerCents, ...s.coproducerCents)).toBeGreaterThanOrEqual(0);
			})
		);
	});

	it('never pays a coproducer more than their exact share, nor a cent less than its floor', () => {
		fc.assert(
			fc.property(sale, shares, ({ gross, fee }, bps) => {
				const s = splitSale(gross, fee, bps);
				bps.forEach((bp, i) => {
					const exact = (s.netCents * bp) / 10_000;
					expect(s.coproducerCents[i]).toBeLessThanOrEqual(exact);
					expect(s.coproducerCents[i]).toBeGreaterThan(exact - 1);
				});
			})
		);
	});

	it.each([
		[-1, 0, []],
		[100, 101, []],
		[1.5, 0, []],
		[100, 0, [10_001]],
		[100, 0, [9_001]],
		[100, 0, [5_000, 4_001]]
	])('rejects invalid input (%d, %d, %j)', (gross, fee, bps) => {
		expect(() => splitSale(gross, fee, bps)).toThrow(RangeError);
	});
});

describe('splitRefund', () => {
	it('keeps the fixed fee and charges it to producer and coproducer in proportion (RN-06)', () => {
		// gross 10000, fee 749 (500 + 249), net 9251; back from the parties: 9251 + 249 = 9500
		expect(splitRefund(10_000, 749, [2_500])).toEqual({
			studentCents: 10_000,
			platformCents: 500,
			producerCents: 7_125,
			coproducerCents: [2_375]
		});
	});

	it('returns the gross exactly: platform plus parties', () => {
		fc.assert(
			fc.property(sale, shares, ({ gross, fee }, bps) => {
				const r = splitRefund(gross, fee, bps);
				expect(r.studentCents).toBe(gross);
				expect(r.platformCents + r.producerCents + sum(r.coproducerCents)).toBe(gross);
			})
		);
	});

	it('never gives a party back less than it received from the sale', () => {
		fc.assert(
			fc.property(sale, shares, ({ gross, fee }, bps) => {
				const s = splitSale(gross, fee, bps);
				const r = splitRefund(gross, fee, bps);
				expect(r.producerCents).toBeGreaterThanOrEqual(s.producerCents);
				bps.forEach((_, i) =>
					expect(r.coproducerCents[i]).toBeGreaterThanOrEqual(s.coproducerCents[i]!)
				);
			})
		);
	});
});
