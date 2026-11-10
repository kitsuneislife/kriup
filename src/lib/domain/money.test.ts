import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	addDays,
	assertBp,
	assertCents,
	assertSignedCents,
	MAX_CENTS,
	shareDown,
	shareHalfUp
} from './money';

const cents = fc.integer({ min: 0, max: MAX_CENTS });
const bp = fc.integer({ min: 0, max: 10_000 });

describe('shares', () => {
	it('match exact integer arithmetic for every valid amount', () => {
		fc.assert(
			fc.property(cents, bp, (c, b) => {
				const product = BigInt(c) * BigInt(b);
				expect(shareDown(c, b)).toBe(Number(product / 10_000n));
				expect(shareHalfUp(c, b)).toBe(Number((product + 5_000n) / 10_000n));
			})
		);
	});

	it('round down and half up at the cent', () => {
		expect(shareDown(1_001, 3_333)).toBe(333); // 333.6333
		expect(shareHalfUp(1_001, 3_333)).toBe(334);
		expect(shareHalfUp(10, 500)).toBe(1); // 0.5
		expect(shareHalfUp(9, 500)).toBe(0); // 0.45
	});

	it('stay exact at the largest amount, where float division would round up', () => {
		expect(shareDown(MAX_CENTS, 9_999)).toBe(Number((BigInt(MAX_CENTS) * 9_999n) / 10_000n));
	});
});

describe('guards', () => {
	it.each([-1, 1.5, NaN, Infinity, MAX_CENTS + 1])('rejects %d cents', (value) => {
		expect(() => assertCents('x', value)).toThrow(RangeError);
	});

	it('allows signed cents within the same bound', () => {
		expect(() => assertSignedCents('x', -MAX_CENTS)).not.toThrow();
		expect(() => assertSignedCents('x', -0.5)).toThrow(RangeError);
	});

	it.each([-1, 10_001, 2.5])('rejects %d basis points', (value) => {
		expect(() => assertBp('x', value)).toThrow(RangeError);
	});
});

it('adds calendar days as exact 24 h periods', () => {
	expect(addDays(new Date('2026-02-25T15:00:00Z'), 7).toISOString()).toBe(
		'2026-03-04T15:00:00.000Z'
	);
});
