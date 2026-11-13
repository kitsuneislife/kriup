// What the person reads for the state of a support ticket, in one place. Safe on the client.

import type { Tone } from './ui';

export const ticketStatusText: Record<'open' | 'closed', { label: string; tone: Tone }> = {
	open: { label: 'Aberto', tone: 'success' },
	closed: { label: 'Fechado', tone: 'neutral' }
};
