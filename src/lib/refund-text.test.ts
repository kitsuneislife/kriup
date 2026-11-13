import { describe, expect, it } from 'vitest';
import {
	producerCanDecide,
	producerDeadline,
	producerQueue,
	producerRefundHeadline,
	producerRefundStatus,
	refundSteps
} from './refund-text';

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

describe('refundSteps for the producer', () => {
	it('tells the same history in the second person to the producer', () => {
		const pending = refundSteps({ ...base, status: 'with_producer' }, 'producer');
		expect(pending.map((s) => s.title)).toEqual([
			'O aluno pediu o reembolso',
			'Você analisa',
			'Valor devolvido e acesso encerrado'
		]);
		// the producer sees the hour too: the deadline is theirs
		expect(pending[1]?.description).toMatch(/^Resposta até 4 de nov\. de 2026, \d{2}:\d{2}\.$/);
		const contested = refundSteps(
			{ ...base, status: 'with_platform', contested: true },
			'producer'
		);
		expect(contested.map((s) => s.title)).toContain('Você recusou');
		expect(contested.map((s) => s.title)).toContain('O aluno contestou a recusa');
	});
});

describe('the producer side', () => {
	const now = new Date('2026-11-03T12:00:00Z');
	const due = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

	it('lets the producer decide only before the deadline', () => {
		expect(producerCanDecide({ status: 'with_producer', dueAt: due(1) }, now)).toBe(true);
		expect(producerCanDecide({ status: 'with_producer', dueAt: now }, now)).toBe(false);
		expect(producerCanDecide({ status: 'with_platform', dueAt: due(24) }, now)).toBe(false);
	});

	it('names a request past the deadline, even before the job moves it', () => {
		const late = { status: 'with_producer' as const, dueAt: due(-1), contested: false };
		expect(producerRefundStatus(late, now).label).toBe('Prazo encerrado');
		expect(producerRefundHeadline(late, now).title).toBe('O prazo para responder terminou');
		expect(producerRefundStatus({ status: 'declined', dueAt: due(-1) }, now).label).toBe(
			'Recusado por você'
		);
	});

	it('tells an escalated request from a contested one', () => {
		const r = { status: 'with_platform' as const, dueAt: due(48) };
		expect(producerRefundHeadline({ ...r, contested: false }, now).title).toBe(
			'O pedido foi para a plataforma'
		);
		expect(producerRefundHeadline({ ...r, contested: true }, now).title).toBe(
			'O aluno contestou a recusa'
		);
	});

	it('warns on the last day and says when the deadline is gone', () => {
		// a fresh request has three days, not "two" a second later
		expect(producerDeadline(due(72 - 0.01), now)).toEqual({
			label: 'Faltam 3 dias',
			tone: 'secondary'
		});
		expect(producerDeadline(due(30), now).label).toBe('Falta 1 dia');
		expect(producerDeadline(due(5.5), now)).toEqual({ label: 'Faltam 5 horas', tone: 'warning' });
		expect(producerDeadline(due(0.5), now).label).toBe('Falta menos de 1 hora');
		expect(producerDeadline(due(0), now)).toEqual({ label: 'Prazo encerrado', tone: 'danger' });
	});

	it('puts the decidable requests first by deadline and the rest newest first', () => {
		const row = (
			id: string,
			status: 'with_producer' | 'completed',
			dueH: number,
			openedH: number
		) => ({
			id,
			status,
			dueAt: due(dueH),
			openedAt: due(openedH)
		});
		const { waiting, others } = producerQueue(
			[
				row('late', 'with_producer', 60, -10),
				row('soon', 'with_producer', 2, -60),
				row('gone', 'with_producer', -1, -80),
				row('old', 'completed', -200, -300),
				row('new', 'completed', -5, -20)
			],
			now
		);
		expect(waiting.map((r) => r.id)).toEqual(['soon', 'late']);
		expect(others.map((r) => r.id)).toEqual(['new', 'gone', 'old']);
	});
});
