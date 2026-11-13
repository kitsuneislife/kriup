// What the student reads for a refund: the badge, the headline and the Timeline of its
// steps, in one place. Safe on the client.

import type { RefundStatus } from './domain/states';
import type { Status, Tone } from './ui';
import { formatDate } from './ui/format';

/** The StatusBadge of each refund state (docs/design/cores.md). */
export const refundStatusText: Record<RefundStatus, { status: Status; label: string }> = {
	with_producer: { status: 'com_produtor', label: 'Com o produtor' },
	declined: { status: 'recusado', label: 'Recusado pelo produtor' },
	with_platform: { status: 'com_plataforma', label: 'Com a plataforma' },
	approved: { status: 'aprovado', label: 'Aprovado' },
	final_declined: { status: 'recusado_final', label: 'Recusado pela plataforma' },
	completed: { status: 'concluido', label: 'Reembolsado' }
};

/** What happens now and next, said to the student. */
export const refundHeadline: Record<RefundStatus, { title: string; body: string }> = {
	with_producer: {
		title: 'O produtor está analisando o seu pedido',
		body: 'Ele responde até o prazo abaixo. Se não responder, o pedido passa para a plataforma, que decide em seguida. Você não precisa fazer nada.'
	},
	declined: {
		title: 'O produtor recusou o pedido',
		body: 'O motivo está na linha do tempo. Se não concordar, você pode contestar uma vez: a plataforma analisa e a decisão dela vale.'
	},
	with_platform: {
		title: 'A plataforma está analisando o seu pedido',
		body: 'Nossa equipe decide até o prazo abaixo. Se quiser acrescentar algo, escreva na conversa.'
	},
	approved: {
		title: 'Reembolso aprovado',
		body: 'O valor está sendo devolvido pelo meio de pagamento e o seu acesso será encerrado.'
	},
	final_declined: {
		title: 'A plataforma recusou o pedido',
		body: 'Esta decisão é final. O motivo está na linha do tempo e o seu acesso continua.'
	},
	completed: {
		title: 'Reembolso concluído',
		body: 'O valor foi devolvido e o acesso ao produto foi encerrado. O prazo para ver o dinheiro depende do seu banco ou cartão.'
	}
};

/** Statuses where someone still has to decide, so owner and deadline matter. */
export const refundPending = (status: RefundStatus) =>
	status === 'with_producer' || status === 'with_platform';

type Step = {
	title: string;
	time?: string;
	description?: string;
	state: 'done' | 'current' | 'upcoming';
	tone?: Tone;
};

type Input = {
	status: RefundStatus;
	contested: boolean;
	declineReason: string | null;
	openedAt: Date;
	dueAt: Date;
};

/** The steps of a refund, from what the request holds (there is no history table). */
export function refundSteps(r: Input): Step[] {
	const until = `Resposta até ${formatDate(r.dueAt, 'date')}.`;
	const sent: Step = {
		title: 'Pedido enviado',
		time: formatDate(r.openedAt, 'datetime'),
		state: 'done'
	};
	const producerDeclined: Step = {
		title: 'Recusado pelo produtor',
		description: r.declineReason ?? undefined,
		state: 'done',
		tone: 'danger'
	};
	const contested: Step = { title: 'Você contestou', state: 'done' };
	const approved: Step = { title: 'Reembolso aprovado', state: 'done', tone: 'success' };
	const paid: Step = { title: 'Valor devolvido e acesso encerrado', state: 'upcoming' };

	switch (r.status) {
		case 'with_producer':
			return [sent, { title: 'O produtor analisa', description: until, state: 'current' }, paid];
		case 'declined':
			return [
				sent,
				producerDeclined,
				{ title: 'Você pode contestar', description: 'Uma única vez.', state: 'current' }
			];
		case 'with_platform':
			return [
				sent,
				...(r.contested
					? [producerDeclined, contested]
					: [{ title: 'O prazo do produtor passou', state: 'done', tone: 'warning' } as Step]),
				{ title: 'A plataforma analisa', description: until, state: 'current' },
				paid
			];
		case 'approved':
			return [sent, approved, { ...paid, state: 'current' }];
		case 'completed':
			return [sent, approved, { ...paid, state: 'done' }];
		case 'final_declined':
			return [
				sent,
				...(r.contested ? [contested] : []),
				{
					title: 'Recusado pela plataforma',
					description: r.declineReason ?? undefined,
					state: 'done',
					tone: 'danger'
				}
			];
	}
}
