import { addDays, assertDate } from './money';
import { PRODUCER_RESPONSE_DAYS, SUPPORT_RESPONSE_DAYS } from './params';
import { isWithinGuarantee } from './retention';
import { assertTransition, DomainError, REFUND_TRANSITIONS, type RefundStatus } from './states';

export const REFUND_OWNERS = ['producer', 'platform'] as const;
export type RefundOwner = (typeof REFUND_OWNERS)[number];

/**
 * A refund request (RN-08 to RN-10). It always has an owner and a deadline: while a
 * decision is pending they say who must act and by when; after a decision they keep
 * the values of the last step, so the history stays readable.
 */
export interface Refund {
	status: RefundStatus;
	owner: RefundOwner;
	dueAt: Date;
	contested: boolean;
	/** Visible to the student; set by the last decline. */
	declineReason: string | null;
}

/** RN-03: approved on the spot inside the guarantee, otherwise the producer decides (RN-08). */
export function openRefund(paidAt: Date, now: Date, guaranteeDays?: number): Refund {
	assertDate('now', now);
	if (now < paidAt) throw new RangeError('a refund cannot be opened before the payment');
	if (isWithinGuarantee(paidAt, now, guaranteeDays)) {
		return {
			status: 'approved',
			owner: 'platform',
			dueAt: now,
			contested: false,
			declineReason: null
		};
	}
	return {
		status: 'with_producer',
		owner: 'producer',
		dueAt: addDays(now, PRODUCER_RESPONSE_DAYS),
		contested: false,
		declineReason: null
	};
}

export function approve(refund: Readonly<Refund>, actor: RefundOwner, now: Date): Refund {
	assertTurn(refund, actor, now);
	assertTransition(REFUND_TRANSITIONS, refund.status, 'approved');
	return { ...refund, status: 'approved', owner: 'platform', dueAt: now };
}

/** RN-08: a decline needs a reason the student can read. The platform's is final. */
export function decline(
	refund: Readonly<Refund>,
	actor: RefundOwner,
	reason: string,
	now: Date
): Refund {
	const declineReason = reason.trim();
	if (declineReason === '') {
		throw new DomainError('decline_reason_required', 'a decline needs a reason for the student');
	}
	assertTurn(refund, actor, now);
	const status = actor === 'producer' ? 'declined' : 'final_declined';
	assertTransition(REFUND_TRANSITIONS, refund.status, status);
	return { ...refund, status, declineReason };
}

/**
 * RN-08: once the producer's deadline passes, support takes over. Its deadline counts
 * from the missed one, so a late job never gives support extra days.
 */
export function escalate(refund: Readonly<Refund>, now: Date): Refund {
	assertDate('now', now);
	if (refund.status !== 'with_producer') {
		throw new DomainError('invalid_transition', `a ${refund.status} refund does not escalate`);
	}
	if (now < refund.dueAt) {
		throw new DomainError('deadline_not_passed', 'the producer deadline has not passed');
	}
	return {
		...refund,
		status: 'with_platform',
		owner: 'platform',
		dueAt: addDays(refund.dueAt, SUPPORT_RESPONSE_DAYS)
	};
}

/** RN-09: the student can contest a producer's decline once; it goes straight to support. */
export function contest(refund: Readonly<Refund>, now: Date): Refund {
	assertDate('now', now);
	if (refund.contested) {
		throw new DomainError('already_contested', 'a refund can be contested only once');
	}
	if (refund.status !== 'declined') {
		throw new DomainError('not_contestable', 'only a declined refund can be contested');
	}
	return {
		...refund,
		status: 'with_platform',
		owner: 'platform',
		dueAt: addDays(now, SUPPORT_RESPONSE_DAYS),
		contested: true
	};
}

/** RN-06: reversals recorded and access revoked, in the same transaction. */
export function complete(refund: Readonly<Refund>): Refund {
	assertTransition(REFUND_TRANSITIONS, refund.status, 'completed');
	return { ...refund, status: 'completed' };
}

// Only the current owner decides, and the producer only before the deadline: after it
// the request belongs to support even if the escalation job has not run yet.
function assertTurn(refund: Readonly<Refund>, actor: RefundOwner, now: Date): void {
	assertDate('now', now);
	if (refund.status !== 'with_producer' && refund.status !== 'with_platform') {
		throw new DomainError(
			'invalid_transition',
			`no decision is pending on a ${refund.status} refund`
		);
	}
	if (actor !== refund.owner) {
		throw new DomainError('not_your_turn', `the ${refund.owner} decides this refund`);
	}
	if (actor === 'producer' && now >= refund.dueAt) {
		throw new DomainError('deadline_passed', 'the producer deadline has passed');
	}
}
