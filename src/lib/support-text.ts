// What support reads on the blocks and audit screens: the block choice of the form, what
// each block holds, and each audit record as a sentence. Safe on the client.

export type BlockTarget = 'balance' | 'product' | 'account';

/** What a block holds, as the support list names it. */
export const blockTargetText: Record<BlockTarget, string> = {
	balance: 'Saldo',
	product: 'Produto',
	account: 'Conta'
};

/**
 * The one select of the block form: `balance`, or `product:<id>` for one of the person's
 * products. The target is not checked here: anything else goes on to the schema, which
 * refuses it on the field.
 */
export function blockChoice(value: string): { target: BlockTarget; productId: string | null } {
	const [target = '', productId = null] = value.split(':', 2);
	return { target: target as BlockTarget, productId: productId || null };
}

/** Who or what an audited action touched, resolved by the service from the record. */
export type AuditTarget =
	| { kind: 'block'; target: BlockTarget; userName: string; productName: string | null }
	| { kind: 'refund'; studentName: string; productName: string }
	| { kind: 'payout'; userName: string }
	| { kind: 'ticket'; studentName: string; subject: string };

const actions: Record<string, string> = {
	'block.create': 'Bloqueou',
	'block.lift': 'Desbloqueou',
	'refund.approve': 'Aprovou o reembolso',
	'refund.decline': 'Recusou o reembolso',
	'payout.complete': 'Concluiu o saque',
	'payout.decline': 'Recusou o saque',
	'ticket.close': 'Encerrou o chamado'
};

/** The audited action in Portuguese; an unknown one shows as recorded, never hidden. */
export function auditActionText(action: string): string {
	return actions[action] ?? action;
}

/** The target of an audit record; null when the record names nothing that still exists. */
export function auditTargetText(target: AuditTarget | null): string {
	if (!target) return 'Alvo não encontrado';
	switch (target.kind) {
		case 'block':
			return target.target === 'product'
				? `Produto ${target.productName ?? 'removido'} de ${target.userName}`
				: `${blockTargetText[target.target]} de ${target.userName}`;
		case 'refund':
			return `Reembolso de ${target.studentName} · ${target.productName}`;
		case 'payout':
			return `Saque de ${target.userName}`;
		case 'ticket':
			return `Chamado de ${target.studentName}: ${target.subject}`;
	}
}

const hoursFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Title of the support queue notice when producers have requested payouts waiting. */
export function payoutsBannerTitle(count: number): string {
	return count === 1 ? '1 saque aguardando revisão' : `${count} saques aguardando revisão`;
}

/** Formats a median duration in hours for the Lean Canvas metrics cards. */
export function formatHoursMetric(hours: number | null): string {
	if (hours === null) return 'Sem dados';
	if (hours < 1) return `${Math.round(hours * 60)} min`;
	return `${hoursFormat.format(Math.round(hours * 10) / 10)} h`;
}

/** Label for an order count in charts and hints. */
export function pluralOrders(count: number): string {
	return count === 1 ? '1 pedido' : `${count} pedidos`;
}
