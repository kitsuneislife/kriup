import { describe, expect, it } from 'vitest';
import { PAYOUT_TRANSITIONS } from './domain/states';
import { payoutStatusText } from './payout-text';

describe('payoutStatusText', () => {
	it('names every payout state, so the history never shows a raw code', () => {
		expect(Object.keys(payoutStatusText).sort()).toEqual(Object.keys(PAYOUT_TRANSITIONS).sort());
		for (const { label } of Object.values(payoutStatusText)) expect(label).toMatch(/^\p{Lu}/u);
	});
});
