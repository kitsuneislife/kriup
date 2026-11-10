import { addDays, assertDate, assertSignedCents } from './money';
import { GUARANTEE_DAYS } from './params';
import type { EntryState } from './states';

export interface Balance {
	heldCents: number;
	releasedCents: number;
	paidOutCents: number;
}

/**
 * RN-03/RN-04: the instant the guarantee ends and held money becomes released, counted
 * in calendar days from the payment confirmation. An offer may give more than the
 * legal 7 days, never less.
 */
export function releaseAt(paidAt: Date, guaranteeDays: number = GUARANTEE_DAYS): Date {
	assertDate('paidAt', paidAt);
	if (!Number.isInteger(guaranteeDays) || guaranteeDays < GUARANTEE_DAYS) {
		throw new RangeError(`guaranteeDays must be an integer of at least ${GUARANTEE_DAYS}`);
	}
	return addDays(paidAt, guaranteeDays);
}

/** The guarantee covers [paidAt, releaseAt): at releaseAt the money is already released. */
export function isWithinGuarantee(
	paidAt: Date,
	now: Date,
	guaranteeDays: number = GUARANTEE_DAYS
): boolean {
	assertDate('now', now);
	return now < releaseAt(paidAt, guaranteeDays);
}

/**
 * The balance is never stored: it is the sum of the entries per state (modelo-de-dados
 * section 3), so the panel always matches the statement (US-03). Released can go
 * negative after a refund of money already released or paid out (RN-07).
 */
export function balance(entries: Iterable<{ amountCents: number; state: EntryState }>): Balance {
	const total: Balance = { heldCents: 0, releasedCents: 0, paidOutCents: 0 };
	for (const { amountCents, state } of entries) {
		assertSignedCents('amountCents', amountCents);
		if (state === 'held') total.heldCents += amountCents;
		else if (state === 'released') total.releasedCents += amountCents;
		else if (state === 'paid_out') total.paidOutCents += amountCents;
	}
	return total;
}
