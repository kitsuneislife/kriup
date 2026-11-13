import { describe, expect, it } from 'vitest';
import { refundSteps } from './refund-text';

const base = {
	contested: false,
	declineReason: 'Fora do que foi prometido',
	openedAt: new Date('2026-11-01T12:00:00Z'),
	dueAt: new Date('2026-11-04T12:00:00Z')
};

describe('refundSteps', () => {
	it('always opens with the request and has exactly one current step while pending', () => {
		for (const status of ['with_producer', 'declined', 'with_platform', 'approved'] as const) {
			const steps = refundSteps({ ...base, status });
			expect(steps[0]?.title).toBe('Pedido enviado');
			expect(steps.filter((s) => s.state === 'current')).toHaveLength(1);
		}
	});

	it('shows the deadline of whoever is deciding', () => {
		const steps = refundSteps({ ...base, status: 'with_producer' });
		expect(steps[1]?.description).toMatch(/^Resposta até 4 de nov/);
	});

	it('keeps the producer decline in a contested request, not after the final decline', () => {
		const pending = refundSteps({ ...base, status: 'with_platform', contested: true });
		expect(pending.map((s) => s.title)).toContain('Recusado pelo produtor');
		const final = refundSteps({ ...base, status: 'final_declined', contested: true });
		expect(final.map((s) => s.title)).not.toContain('Recusado pelo produtor');
		expect(final.at(-1)?.description).toBe(base.declineReason);
	});
});
