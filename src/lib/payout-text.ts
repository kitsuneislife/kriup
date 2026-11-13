// What the producer reads for a payout in the history: the badge of each state. Safe on
// the client.

import type { PayoutStatus } from './domain/states';
import type { Status } from './ui';

/** The StatusBadge of each payout state (docs/design/cores.md: blue is withdrawn). */
export const payoutStatusText: Record<PayoutStatus, { status: Status; label: string }> = {
	requested: { status: 'aguardando', label: 'Em análise' },
	completed: { status: 'sacado', label: 'Concluído' },
	declined: { status: 'recusado', label: 'Recusado' }
};
