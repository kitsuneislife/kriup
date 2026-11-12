// What the person reads for the state of an order, in one place. Safe on the client.

import type { OrderStatus } from './domain/states';
import type { Status } from './ui';

/** The StatusBadge of each order state (docs/design/cores.md). */
export const orderStatusText: Record<OrderStatus, { status: Status; label: string }> = {
	pending: { status: 'aguardando', label: 'Aguardando pagamento' },
	paid: { status: 'pago', label: 'Pago' },
	expired: { status: 'expirado', label: 'Expirado' },
	declined: { status: 'recusado', label: 'Recusado' },
	refunded: { status: 'reembolsado', label: 'Reembolsado' }
};
