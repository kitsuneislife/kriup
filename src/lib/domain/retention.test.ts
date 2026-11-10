import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MAX_CENTS } from './money';
import { balance, isWithinGuarantee, releaseAt } from './retention';
import type { EntryState } from './states';

const paidAt = new Date('2026-03-01T14:30:00Z');

describe('releaseAt', () => {
	it('ends the guarantee 7 calendar days after the payment (RN-03, RN-04)', () => {
		expect(releaseAt(paidAt).toISOString()).toBe('2026-03-08T14:30:00.000Z');
	});

	it('honours a longer guarantee from the offer', () => {
		expect(releaseAt(paidAt, 30).toISOString()).toBe('2026-03-31T14:30:00.000Z');
	});

	it.each([6, 0, 7.5])('rejects a guarantee of %d days', (days) => {
		expect(() => releaseAt(paidAt, days)).toThrow(RangeError);
	});

	it('rejects an invalid date', () => {
		expect(() => releaseAt(new Date('nope'))).toThrow(RangeError);
	});
});

describe('isWithinGuarantee', () => {
	const end = releaseAt(paidAt);

	it('covers the whole guarantee up to, not including, the release instant', () => {
		expect(isWithinGuarantee(paidAt, paidAt)).toBe(true);
		expect(isWithinGuarantee(paidAt, new Date(end.getTime() - 1))).toBe(true);
		expect(isWithinGuarantee(paidAt, end)).toBe(false);
	});
});

describe('balance', () => {
	it('sums each state and leaves reversed entries out', () => {
		expect(
			balance([
				{ amountCents: 9_251, state: 'held' },
				{ amountCents: 4_000, state: 'released' },
				{ amountCents: 5_000, state: 'paid_out' },
				{ amountCents: 1_000, state: 'reversed' }
			])
		).toEqual({ heldCents: 9_251, releasedCents: 4_000, paidOutCents: 5_000 });
	});

	it('goes negative when a refund takes more than what is released (RN-07)', () => {
		const entries = [
			{ amountCents: 1_000, state: 'released' as const },
			{ amountCents: -3_000, state: 'released' as const }
		];
		expect(balance(entries).releasedCents).toBe(-2_000);
	});

	it('matches the sum of the entries that are not reversed (US-03)', () => {
		const entry = fc.record({
			amountCents: fc.integer({ min: -1_000_000, max: 1_000_000 }),
			state: fc.constantFrom<EntryState>('held', 'released', 'paid_out', 'reversed')
		});
		fc.assert(
			fc.property(fc.array(entry), (entries) => {
				const b = balance(entries);
				const expected = entries
					.filter((e) => e.state !== 'reversed')
					.reduce((total, e) => total + e.amountCents, 0);
				expect(b.heldCents + b.releasedCents + b.paidOutCents).toBe(expected);
			})
		);
	});

	it('rejects a fractional amount', () => {
		expect(() => balance([{ amountCents: 0.5, state: 'held' }])).toThrow(RangeError);
		expect(() => balance([{ amountCents: MAX_CENTS + 1, state: 'held' }])).toThrow(RangeError);
	});
});
