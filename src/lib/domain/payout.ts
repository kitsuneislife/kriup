import { assertCents, assertSignedCents } from './money';
import { PAYOUT_FEE_CENTS, PAYOUT_MIN_CENTS } from './params';

export type PayoutRefusal = 'negative_balance' | 'below_minimum' | 'insufficient_balance';

export type PayoutQuote =
	| { ok: true; amountCents: number; feeCents: number; receivedCents: number }
	| { ok: false; reason: PayoutRefusal };

/**
 * RN-13: what a payout costs, shown before the confirmation. Only released money can be
 * withdrawn and the fixed fee comes out of the amount. A negative balance blocks every
 * payout (RN-07); the reason lets the panel explain it.
 */
export function quotePayout(releasedCents: number, amountCents: number): PayoutQuote {
	assertSignedCents('releasedCents', releasedCents);
	assertCents('amountCents', amountCents);
	if (releasedCents < 0) return { ok: false, reason: 'negative_balance' };
	if (amountCents < PAYOUT_MIN_CENTS) return { ok: false, reason: 'below_minimum' };
	if (amountCents > releasedCents) return { ok: false, reason: 'insufficient_balance' };
	return {
		ok: true,
		amountCents,
		feeCents: PAYOUT_FEE_CENTS,
		receivedCents: amountCents - PAYOUT_FEE_CENTS
	};
}
