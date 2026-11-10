import { withinShareLimit } from './coproduction';
import { assertCents, shareDown, shareHalfUp } from './money';
import { PLATFORM_FEE_BP, PLATFORM_FIXED_FEE_CENTS } from './params';

export interface SaleSplit {
	netCents: number;
	producerCents: number;
	/** One part per coproducer, in the order of the shares given. */
	coproducerCents: number[];
}

export interface RefundSplit {
	/** The student always gets the gross amount back (RN-06). */
	studentCents: number;
	/** The percentage fee the platform gives back; it keeps the fixed fee. */
	platformCents: number;
	/** What each party gives back, split like the sale. */
	producerCents: number;
	coproducerCents: number[];
}

/** RN-02: percentage of the gross rounded half up, plus the fixed fee. */
export function platformFee(grossCents: number): number {
	assertCents('grossCents', grossCents);
	return shareHalfUp(grossCents, PLATFORM_FEE_BP) + PLATFORM_FIXED_FEE_CENTS;
}

/**
 * RN-05: net = gross - fee. Each coproducer gets their share of the net rounded down;
 * the producer gets the rest, so the parts always sum to the net.
 */
export function splitSale(
	grossCents: number,
	feeCents: number,
	coproducerBps: readonly number[] = []
): SaleSplit {
	assertCents('grossCents', grossCents);
	assertCents('feeCents', feeCents);
	if (feeCents > grossCents) throw new RangeError('feeCents cannot exceed grossCents');

	const netCents = grossCents - feeCents;
	return { netCents, ...divide(netCents, coproducerBps) };
}

/**
 * RN-06: the student gets the gross back and the platform returns its percentage fee.
 * The fixed fee is not returned, so producer and coproducers give back net + fixed fee,
 * split by the same rule and shares as the sale.
 */
export function splitRefund(
	grossCents: number,
	feeCents: number,
	coproducerBps: readonly number[] = []
): RefundSplit {
	const { netCents } = splitSale(grossCents, feeCents, coproducerBps);
	// shortcut: assumes the current fixed fee was charged; store it on the order once RN-02 changes.
	const keptCents = Math.min(feeCents, PLATFORM_FIXED_FEE_CENTS);
	return {
		studentCents: grossCents,
		platformCents: feeCents - keptCents,
		...divide(netCents + keptCents, coproducerBps)
	};
}

function divide(cents: number, coproducerBps: readonly number[]) {
	if (!withinShareLimit(coproducerBps)) {
		throw new RangeError('coproducer shares exceed the RN-12 limit');
	}
	const coproducerCents = coproducerBps.map((bp) => shareDown(cents, bp));
	const producerCents = coproducerCents.reduce((rest, part) => rest - part, cents);
	return { producerCents, coproducerCents };
}
