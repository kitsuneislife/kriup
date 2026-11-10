// State machines from docs/produto/regras-de-negocio.md, sections 3 to 5.

type Machine<S extends string> = Readonly<Record<S, readonly S[]>>;

/** A rule forbids the action: the request is stale or forged, never a server fault. */
export class DomainError extends Error {
	override name = 'DomainError';
}

export const ORDER_TRANSITIONS = {
	pending: ['paid', 'expired', 'declined'],
	paid: ['refunded'],
	expired: [],
	declined: [],
	refunded: []
} as const satisfies Machine<string>;

/** Ledger entry states: the balance buckets of docs/tecnico/modelo-de-dados.md section 3. */
export const ENTRY_TRANSITIONS = {
	held: ['released', 'reversed'],
	released: ['paid_out', 'reversed'],
	paid_out: [],
	reversed: []
} as const satisfies Machine<string>;

/** Who acts in each state is in refund.ts. */
export const REFUND_TRANSITIONS = {
	with_producer: ['approved', 'declined', 'with_platform'],
	declined: ['with_platform'],
	with_platform: ['approved', 'final_declined'],
	approved: ['completed'],
	final_declined: [],
	completed: []
} as const satisfies Machine<string>;

/** RN-01: a product goes live once, with no pendencies. Blocks live apart (RN-11). */
export const PRODUCT_TRANSITIONS = {
	draft: ['published'],
	published: []
} as const satisfies Machine<string>;

/** RN-16: access lasts while the order is paid and not refunded. */
export const ENROLLMENT_TRANSITIONS = {
	active: ['revoked'],
	revoked: []
} as const satisfies Machine<string>;

/** RN-12: a term counts only once accepted; a new percentage ends the previous term. */
export const COPRODUCTION_TRANSITIONS = {
	invited: ['active', 'canceled'],
	active: ['ended'],
	ended: [],
	canceled: []
} as const satisfies Machine<string>;

/** RN-13: the amount leaves the released balance on request and comes back if declined. */
export const PAYOUT_TRANSITIONS = {
	requested: ['completed', 'declined'],
	completed: [],
	declined: []
} as const satisfies Machine<string>;

/** RF-35: a support ticket tied to an order. */
export const TICKET_TRANSITIONS = {
	open: ['closed'],
	closed: []
} as const satisfies Machine<string>;

export type OrderStatus = keyof typeof ORDER_TRANSITIONS;
export type EntryState = keyof typeof ENTRY_TRANSITIONS;
export type RefundStatus = keyof typeof REFUND_TRANSITIONS;
export type ProductStatus = keyof typeof PRODUCT_TRANSITIONS;
export type EnrollmentStatus = keyof typeof ENROLLMENT_TRANSITIONS;
export type CoproductionStatus = keyof typeof COPRODUCTION_TRANSITIONS;
export type PayoutStatus = keyof typeof PAYOUT_TRANSITIONS;
export type TicketStatus = keyof typeof TICKET_TRANSITIONS;

/** The states of a machine, in declaration order; the database enums use the same values. */
export function statesOf<M extends Machine<string>>(
	machine: M
): [keyof M & string, ...(keyof M & string)[]] {
	return Object.keys(machine) as [keyof M & string, ...(keyof M & string)[]];
}

export function canTransition<S extends string>(machine: Machine<S>, from: S, to: S): boolean {
	return machine[from].includes(to);
}

export function assertTransition<S extends string>(machine: Machine<S>, from: S, to: S): void {
	if (!canTransition(machine, from, to)) throw new DomainError(`cannot go from ${from} to ${to}`);
}
