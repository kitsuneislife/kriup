export interface SaleSplit {
	netCents: number;
	coproducerCents: number;
	producerCents: number;
}

/**
 * Splits a sale (RN-05): net = gross - fee; the coproducer gets their share of
 * net rounded down; the producer gets the rest, so the parts always sum to net.
 * All values are integer cents; the coproducer share is in basis points (2500 = 25%).
 */
export function splitSale(grossCents: number, feeCents: number, coproducerBp: number): SaleSplit {
	for (const [name, value] of [
		['grossCents', grossCents],
		['feeCents', feeCents],
		['coproducerBp', coproducerBp]
	] as const) {
		if (!Number.isInteger(value) || value < 0) {
			throw new RangeError(`${name} must be a non-negative integer`);
		}
	}
	if (feeCents > grossCents) throw new RangeError('feeCents cannot exceed grossCents');
	if (coproducerBp > 10_000) throw new RangeError('coproducerBp cannot exceed 10000');

	const netCents = grossCents - feeCents;
	const coproducerCents = Math.floor((netCents * coproducerBp) / 10_000);
	return { netCents, coproducerCents, producerCents: netCents - coproducerCents };
}
