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

export type OrderStatus = keyof typeof ORDER_TRANSITIONS;
export type EntryState = keyof typeof ENTRY_TRANSITIONS;
export type RefundStatus = keyof typeof REFUND_TRANSITIONS;

export function canTransition<S extends string>(machine: Machine<S>, from: S, to: S): boolean {
	return machine[from].includes(to);
}

export function assertTransition<S extends string>(machine: Machine<S>, from: S, to: S): void {
	if (!canTransition(machine, from, to)) throw new DomainError(`cannot go from ${from} to ${to}`);
}
