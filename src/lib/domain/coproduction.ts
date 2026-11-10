import { assertBp, assertDate } from './money';
import { COPRODUCTION_MAX_BP } from './params';

/**
 * One accepted version of a coproduction contract (RN-12). It starts at the acceptance
 * and ends when a new percentage is accepted, the duration runs out or it is closed.
 */
export interface CoproductionTerm {
	coproducerId: string;
	bp: number;
	effectiveFrom: Date;
	/** Exclusive; null while open-ended. */
	endsAt: Date | null;
}

/** RN-12: the combined share of a product's coproducers stays within the limit. */
export function withinShareLimit(bps: readonly number[]): boolean {
	let total = 0;
	for (const bp of bps) {
		assertBp('bp', bp);
		total += bp;
	}
	return total <= COPRODUCTION_MAX_BP;
}

/**
 * Terms of one product that apply to a sale paid at `at`. A sale before the acceptance
 * gets nothing, and a percentage change only applies to later sales (RN-12, US-04).
 * Throws on data that breaks RN-12: two terms for one coproducer, or shares over the limit.
 */
export function termsInForce(terms: readonly CoproductionTerm[], at: Date): CoproductionTerm[] {
	assertDate('at', at);
	const inForce = terms.filter((term) => {
		assertDate('effectiveFrom', term.effectiveFrom);
		if (term.endsAt !== null) assertDate('endsAt', term.endsAt);
		return term.effectiveFrom <= at && (term.endsAt === null || at < term.endsAt);
	});

	const coproducers = new Set(inForce.map((term) => term.coproducerId));
	if (coproducers.size !== inForce.length) {
		throw new Error('a coproducer has overlapping terms in force');
	}
	if (!withinShareLimit(inForce.map((term) => term.bp))) {
		throw new Error(`coproducer shares in force exceed ${COPRODUCTION_MAX_BP} bp`);
	}
	return inForce;
}
