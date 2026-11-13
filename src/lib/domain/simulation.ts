// RF-50: what a coproducer would get, shown to the producer before inviting.

import { COPRODUCTION_MAX_BP } from './params';
import { platformFee, splitSale } from './split';

export interface SaleSimulation {
	grossCents: number;
	feeCents: number;
	producerCents: number;
	coproducerCents: number;
}

/** One sale at `grossCents` with one coproducer at `percentBp`, split by RN-02 and RN-05. */
export function simulateSale(grossCents: number, percentBp: number): SaleSimulation {
	const feeCents = platformFee(grossCents);
	const { producerCents, coproducerCents } = splitSale(grossCents, feeCents, [percentBp]);
	return { grossCents, feeCents, producerCents, coproducerCents: coproducerCents[0]! };
}

/**
 * Reads a percentage typed the way people write it in Brazil ("30", "12,5", "30%") as
 * basis points within the RN-12 limit. Undefined when it is not one.
 */
export function parsePercent(text: string): number | undefined {
	const match = /^(\d{1,2})(?:,(\d{1,2}))?\s*%?$/.exec(text.trim());
	if (!match) return undefined;
	const bp = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
	return bp >= 1 && bp <= COPRODUCTION_MAX_BP ? bp : undefined;
}
