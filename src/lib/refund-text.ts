// What the student and the producer read for a refund: the badge, the headline, the
// deadline and the Timeline of its steps, in one place. Safe on the client.

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

/** Who reads the steps: the same history, told to the student or to the producer. */
export type RefundViewer = 'student' | 'producer';

/** The steps of a refund, from what the request holds (there is no history table). */
export function refundSteps(r: Input, viewer: RefundViewer = 'student'): Step[] {
	const producer = viewer === 'producer';
	const until = `Resposta até ${formatDate(r.dueAt, producer ? 'datetime' : 'date')}.`;
	const sent: Step = {
		title: producer ? 'O aluno pediu o reembolso' : 'Pedido enviado',
		time: formatDate(r.openedAt, 'datetime'),
		state: 'done'
	};
	const producerDeclined: Step = {
		title: producer ? 'Você recusou' : 'Recusado pelo produtor',
		description: r.declineReason ?? undefined,
		state: 'done',
		tone: 'danger'
	};
	const contested: Step = {
		title: producer ? 'O aluno contestou a recusa' : 'Você contestou',
		state: 'done'
	};
	const approved: Step = { title: 'Reembolso aprovado', state: 'done', tone: 'success' };
	const paid: Step = { title: 'Valor devolvido e acesso encerrado', state: 'upcoming' };

	switch (r.status) {
		case 'with_producer':
			return [
				sent,
				{
					title: producer ? 'Você analisa' : 'O produtor analisa',
					description: until,
					state: 'current'
				},
				paid
			];
		case 'declined':
			return [
				sent,
				producerDeclined,
				{
					title: producer ? 'O aluno pode contestar' : 'Você pode contestar',
					description: producer ? 'Uma única vez. Aí a plataforma decide.' : 'Uma única vez.',
					state: 'current'
				}
			];
		case 'with_platform':
			return [
				sent,
				...(r.contested
					? [producerDeclined, contested]
					: [
							{
								title: producer ? 'O seu prazo passou' : 'O prazo do produtor passou',
								state: 'done',
								tone: 'warning'
							} as Step
						]),
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

// ---------------------------------------------------------------------------
// The producer's side (UC-05)

type Pending = { status: RefundStatus; dueAt: Date };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** RN-08: the producer decides only while the request is theirs and the deadline is ahead. */
export const producerCanDecide = (r: Pending, now: Date) =>
	r.status === 'with_producer' && now < r.dueAt;

/** With the producer, but past the deadline: the job has not moved it to support yet. */
const overdue = (r: Pending, now: Date) => r.status === 'with_producer' && now >= r.dueAt;

/** The badge the producer sees: a request past their deadline is no longer theirs. */
export function producerRefundStatus(r: Pending, now: Date): { status: Status; label: string } {
	if (overdue(r, now)) return { status: 'com_plataforma', label: 'Prazo encerrado' };
	if (r.status === 'declined') return { status: 'recusado', label: 'Recusado por você' };
	return refundStatusText[r.status];
}

/**
 * How close the producer's deadline is, for the queue and the decision card. Rounded to
 * days, then hours on the last day; the exact date and time always goes next to it.
 */
export function producerDeadline(
	dueAt: Date,
	now: Date
): { label: string; tone: 'secondary' | 'warning' | 'danger' } {
	const left = dueAt.getTime() - now.getTime();
	if (left <= 0) return { label: 'Prazo encerrado', tone: 'danger' };
	if (left >= DAY) {
		const days = Math.round(left / DAY);
		return { label: days === 1 ? 'Falta 1 dia' : `Faltam ${days} dias`, tone: 'secondary' };
	}
	const hours = Math.floor(left / HOUR);
	const label =
		hours === 0 ? 'Falta menos de 1 hora' : hours === 1 ? 'Falta 1 hora' : `Faltam ${hours} horas`;
	return { label, tone: 'warning' };
}

/** What happens now and next, said to the producer. */
export function producerRefundHeadline(
	r: Pending & { contested: boolean },
	now: Date
): { title: string; body: string } {
	if (overdue(r, now)) {
		return {
			title: 'O prazo para responder terminou',
			body: 'O pedido passa para a plataforma, que decide em seguida. Você ainda pode escrever na conversa.'
		};
	}
	switch (r.status) {
		case 'with_producer':
			return {
				title: 'O aluno pediu reembolso',
				body: 'Aprove ou recuse com uma justificativa até o prazo. Sem resposta, o pedido passa para a plataforma.'
			};
		case 'declined':
			return {
				title: 'Você recusou o pedido',
				body: 'O aluno lê a sua justificativa e pode contestar uma vez. Se contestar, a plataforma decide.'
			};
		case 'with_platform':
			return r.contested
				? {
						title: 'O aluno contestou a recusa',
						body: 'A plataforma lê o motivo, a sua justificativa e a conversa, e decide. A decisão dela é final.'
					}
				: {
						title: 'O pedido foi para a plataforma',
						body: 'O seu prazo passou sem resposta, então a plataforma decide. Você ainda pode escrever na conversa.'
					};
		case 'approved':
			return {
				title: 'Reembolso aprovado',
				body: 'O valor está sendo devolvido ao aluno. Quando terminar, o acesso é encerrado e a venda é estornada no seu extrato.'
			};
		case 'final_declined':
			return {
				title: 'A plataforma recusou o pedido',
				body: 'Esta decisão é final: a venda continua valendo e o aluno mantém o acesso.'
			};
		case 'completed':
			return {
				title: 'Reembolso concluído',
				body: 'O valor voltou ao aluno, o acesso foi encerrado e a venda foi estornada no seu extrato.'
			};
	}
}

/**
 * The producer's queue in two parts: what they can still decide, closest deadline first,
 * and the rest, newest first.
 */
export function producerQueue<T extends Pending & { openedAt: Date }>(
	rows: readonly T[],
	now: Date
) {
	const waiting = rows
		.filter((r) => producerCanDecide(r, now))
		.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
	const others = rows
		.filter((r) => !producerCanDecide(r, now))
		.sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime());
	return { waiting, others };
}
