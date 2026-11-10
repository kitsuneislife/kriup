import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DAY_MS } from './money';
import { approve, complete, contest, decline, escalate, openRefund, type Refund } from './refund';
import { canTransition, DomainError, REFUND_TRANSITIONS } from './states';

const paidAt = new Date('2026-03-01T12:00:00Z');
const later = (from: Date, days: number) => new Date(from.getTime() + days * DAY_MS);
const outside = later(paidAt, 10);

describe('openRefund', () => {
	it('approves on the spot inside the guarantee (RN-03, US-02)', () => {
		const now = later(paidAt, 6);
		expect(openRefund(paidAt, now)).toEqual({
			status: 'approved',
			owner: 'platform',
			dueAt: now,
			contested: false,
			declineReason: null
		});
	});

	it('gives the producer 3 days outside the guarantee (RN-08)', () => {
		expect(openRefund(paidAt, outside)).toMatchObject({
			status: 'with_producer',
			owner: 'producer',
			dueAt: later(outside, 3)
		});
	});

	it('rejects a refund before the payment', () => {
		expect(() => openRefund(paidAt, later(paidAt, -1))).toThrow(RangeError);
	});
});

describe('producer decision', () => {
	const open = openRefund(paidAt, outside);

	it('approves before the deadline', () => {
		expect(approve(open, 'producer', later(outside, 1)).status).toBe('approved');
	});

	it('declines only with a reason the student sees (RN-08)', () => {
		expect(() => decline(open, 'producer', '   ', outside)).toThrow(DomainError);
		expect(decline(open, 'producer', ' Curso já concluído ', outside)).toMatchObject({
			status: 'declined',
			declineReason: 'Curso já concluído'
		});
	});

	it('cannot decide at or after the deadline, even before the job escalates', () => {
		expect(() => approve(open, 'producer', open.dueAt)).toThrow(DomainError);
	});

	it('cannot be taken by the platform while the producer owns it', () => {
		expect(() => approve(open, 'platform', outside)).toThrow(DomainError);
	});
});

describe('escalation and contest', () => {
	const open = openRefund(paidAt, outside);

	it('moves to support once the deadline passes, with 3 more days from it (RN-08, RN-10)', () => {
		const lateJob = later(open.dueAt, 2);
		expect(escalate(open, lateJob)).toMatchObject({
			status: 'with_platform',
			owner: 'platform',
			dueAt: later(open.dueAt, 3)
		});
		expect(() => escalate(open, later(open.dueAt, -0.01))).toThrow(DomainError);
	});

	it('lets the student contest a decline once, straight to support (RN-09)', () => {
		const declined = decline(open, 'producer', 'Fora do prazo', outside);
		const contested = contest(declined, later(outside, 1));
		expect(contested).toMatchObject({
			status: 'with_platform',
			owner: 'platform',
			contested: true,
			dueAt: later(outside, 4)
		});
		expect(() => contest(contested, later(outside, 2))).toThrow(DomainError);

		const final = decline(contested, 'platform', 'Mantida', later(outside, 2));
		expect(final.status).toBe('final_declined');
		expect(() => contest(final, later(outside, 3))).toThrow(DomainError);
	});

	it('completes only an approved refund (RN-06)', () => {
		const approved = approve(escalate(open, open.dueAt), 'platform', open.dueAt);
		expect(complete(approved).status).toBe('completed');
		expect(() => complete(open)).toThrow(DomainError);
	});
});

describe('any sequence of actions', () => {
	const action = fc.record({
		kind: fc.constantFrom('approve', 'decline', 'escalate', 'contest', 'complete'),
		actor: fc.constantFrom('producer' as const, 'platform' as const),
		hours: fc.integer({ min: 0, max: 120 })
	});

	it('keeps an owner and a deadline, follows the diagram and contests at most once (RN-09, RN-10)', () => {
		fc.assert(
			fc.property(fc.boolean(), fc.array(action, { maxLength: 12 }), (inside, actions) => {
				let now = inside ? later(paidAt, 1) : outside;
				let refund: Refund = openRefund(paidAt, now);
				let contests = 0;
				for (const { kind, actor, hours } of actions) {
					now = new Date(now.getTime() + hours * 3_600_000);
					let next: Refund;
					try {
						if (kind === 'approve') next = approve(refund, actor, now);
						else if (kind === 'decline') next = decline(refund, actor, 'motivo', now);
						else if (kind === 'escalate') next = escalate(refund, now);
						else if (kind === 'contest') next = contest(refund, now);
						else next = complete(refund);
					} catch (error) {
						expect(error).toBeInstanceOf(DomainError);
						continue;
					}
					expect(canTransition(REFUND_TRANSITIONS, refund.status, next.status)).toBe(true);
					if (kind === 'approve' && actor === 'producer') expect(now < refund.dueAt).toBe(true);
					if (kind === 'contest') contests++;
					expect(['producer', 'platform']).toContain(next.owner);
					expect(Number.isNaN(next.dueAt.getTime())).toBe(false);
					refund = next;
				}
				expect(contests).toBeLessThanOrEqual(1);
				expect(refund.contested).toBe(contests === 1);
			})
		);
	});
});
