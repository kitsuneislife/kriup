import { describe, expect, it } from 'vitest';
import { statusTone } from './status';

describe('statusTone', () => {
	it('keeps the color meaning of docs/design/cores.md', () => {
		expect(statusTone.pago).toBe('success');
		expect(statusTone.liberado).toBe('success');
		expect(statusTone.aguardando).toBe('warning');
		expect(statusTone.retido).toBe('warning');
		expect(statusTone.recusado).toBe('danger');
		expect(statusTone.reembolsado).toBe('indigo');
	});

	it('covers 3 order, 7 refund and 4 ledger states', () => {
		expect(Object.keys(statusTone)).toHaveLength(15);
	});
});
