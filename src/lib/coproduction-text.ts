// What the coproducer reads about an invite or a term: the badge, the share, the duration
// and the order of the list, in one place. Safe on the client.

import type { CoproductionStatus } from './domain/states';
import type { Status } from './ui';

/** The StatusBadge of each state of a term (docs/design/cores.md). */
export const coproductionStatusText: Record<CoproductionStatus, { status: Status; label: string }> =
	{
		invited: { status: 'aguardando', label: 'Convite pendente' },
		active: { status: 'pago', label: 'Em vigor' },
		ended: { status: 'expirado', label: 'Encerrado' },
		canceled: { status: 'recusado', label: 'Cancelado' }
	};

/** 2500 basis points read as "25%". */
export const sharePercent = (bp: number) => `${(bp / 100).toLocaleString('pt-BR')}%`;

/** How long the split lasts once accepted; null means no end date. */
export function durationText(durationDays: number | null): string {
	if (durationDays === null) return 'Sem data final';
	return `${durationDays} ${durationDays === 1 ? 'dia' : 'dias'} a partir do aceite`;
}

/** What the invite means for the person now, said to the coproducer. */
export const coproductionHeadline: Record<CoproductionStatus, { title: string; body: string }> = {
	invited: {
		title: 'Você foi convidado para coproduzir',
		body: 'Leia o contrato abaixo. Só depois do seu aceite você passa a receber a sua parte das vendas.'
	},
	active: {
		title: 'Coprodução em vigor',
		body: 'A sua parte de cada venda paga depois do aceite aparece no extrato, retida até o fim da garantia.'
	},
	ended: {
		title: 'Esta versão do contrato terminou',
		body: 'Ela vale só para as vendas pagas enquanto esteve em vigor. Essas vendas continuam no seu extrato.'
	},
	canceled: {
		title: 'Este convite foi cancelado',
		body: 'Ele não vale mais e nenhuma venda foi dividida por ele.'
	}
};

/** Pending invites first (oldest first), then the rest from the newest to the oldest. */
export function sortInvites<T extends { status: CoproductionStatus; createdAt: Date }>(
	terms: readonly T[]
): T[] {
	const open = terms.filter((t) => t.status === 'invited');
	const rest = terms.filter((t) => t.status !== 'invited');
	return [
		...open.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
		...rest.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
	];
}
