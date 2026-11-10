import { describe, expect, it } from 'vitest';
import {
	assertTransition,
	canTransition,
	COPRODUCTION_TRANSITIONS,
	DomainError,
	ENROLLMENT_TRANSITIONS,
	ENTRY_TRANSITIONS,
	ORDER_TRANSITIONS,
	PAYOUT_TRANSITIONS,
	PRODUCT_TRANSITIONS,
	REFUND_TRANSITIONS,
	statesOf,
	TICKET_TRANSITIONS
} from './states';

describe('order', () => {
	it('is paid once and refunded only after payment (RN-15)', () => {
		expect(canTransition(ORDER_TRANSITIONS, 'pending', 'paid')).toBe(true);
		expect(canTransition(ORDER_TRANSITIONS, 'paid', 'paid')).toBe(false);
		expect(canTransition(ORDER_TRANSITIONS, 'pending', 'refunded')).toBe(false);
		expect(canTransition(ORDER_TRANSITIONS, 'expired', 'paid')).toBe(false);
	});
});

describe('ledger entry', () => {
	it('is released before it is paid out and reversed from held or released', () => {
		expect(canTransition(ENTRY_TRANSITIONS, 'held', 'paid_out')).toBe(false);
		expect(canTransition(ENTRY_TRANSITIONS, 'released', 'reversed')).toBe(true);
		expect(canTransition(ENTRY_TRANSITIONS, 'paid_out', 'reversed')).toBe(false);
	});
});

it('lists the states of a machine in order, and every target is one of them', () => {
	expect(statesOf(ORDER_TRANSITIONS)).toEqual([
		'pending',
		'paid',
		'expired',
		'declined',
		'refunded'
	]);
	for (const machine of [
		ORDER_TRANSITIONS,
		ENTRY_TRANSITIONS,
		REFUND_TRANSITIONS,
		PRODUCT_TRANSITIONS,
		ENROLLMENT_TRANSITIONS,
		COPRODUCTION_TRANSITIONS,
		PAYOUT_TRANSITIONS,
		TICKET_TRANSITIONS
	]) {
		const states: readonly string[] = statesOf(machine);
		for (const targets of Object.values<readonly string[]>(machine)) {
			for (const target of targets) expect(states).toContain(target);
		}
	}
});

it('throws a DomainError for a forbidden transition', () => {
	expect(() => assertTransition(ORDER_TRANSITIONS, 'refunded', 'paid')).toThrow(DomainError);
	expect(() => assertTransition(ORDER_TRANSITIONS, 'pending', 'paid')).not.toThrow();
});
