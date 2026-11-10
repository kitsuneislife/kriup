import { describe, expect, it } from 'vitest';
import { quotePayout } from './payout';

describe('quotePayout', () => {
	it('takes the R$ 3,50 fee from the amount (RN-13)', () => {
		expect(quotePayout(10_000, 5_000)).toEqual({
			ok: true,
			amountCents: 5_000,
			feeCents: 350,
			receivedCents: 4_650
		});
	});

	it('allows withdrawing the whole released balance', () => {
		expect(quotePayout(12_345, 12_345)).toMatchObject({ ok: true, receivedCents: 11_995 });
	});

	it.each([
		[-1, 5_000, 'negative_balance'],
		[10_000, 4_999, 'below_minimum'],
		[4_000, 4_000, 'below_minimum'],
		[6_000, 6_001, 'insufficient_balance']
	] as const)('refuses released %d, amount %d: %s', (released, amount, reason) => {
		expect(quotePayout(released, amount)).toEqual({ ok: false, reason });
	});

	it('rejects malformed amounts', () => {
		expect(() => quotePayout(10_000, -5_000)).toThrow(RangeError);
		expect(() => quotePayout(10_000.5, 5_000)).toThrow(RangeError);
	});
});
