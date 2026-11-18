import { describe, expect, it } from 'vitest';
import {
	auditActionText,
	auditTargetText,
	blockChoice,
	formatHoursMetric,
	payoutsBannerTitle,
	pluralOrders
} from './support-text';

describe('blockChoice', () => {
	it('reads the balance and a product of the select', () => {
		expect(blockChoice('balance')).toEqual({ target: 'balance', productId: null });
		expect(blockChoice('product:3f2a')).toEqual({ target: 'product', productId: '3f2a' });
	});

	it('passes anything else on for the schema to refuse', () => {
		expect(blockChoice('')).toEqual({ target: '', productId: null });
		expect(blockChoice('product:')).toEqual({ target: 'product', productId: null });
		expect(blockChoice('nope')).toEqual({ target: 'nope', productId: null });
	});
});

describe('auditActionText', () => {
	it('translates every action support takes', () => {
		expect(auditActionText('block.create')).toBe('Bloqueou');
		expect(auditActionText('block.lift')).toBe('Desbloqueou');
		expect(auditActionText('refund.approve')).toBe('Aprovou o reembolso');
		expect(auditActionText('refund.decline')).toBe('Recusou o reembolso');
		expect(auditActionText('payout.complete')).toBe('Concluiu o saque');
		expect(auditActionText('payout.decline')).toBe('Recusou o saque');
		expect(auditActionText('ticket.close')).toBe('Encerrou o chamado');
	});

	it('shows an unknown action as recorded', () => {
		expect(auditActionText('user.merge')).toBe('user.merge');
	});
});

describe('auditTargetText', () => {
	it('names whose balance, account or product a block holds', () => {
		const base = { kind: 'block', userName: 'Paulo Lima', productName: null } as const;
		expect(auditTargetText({ ...base, target: 'balance' })).toBe('Saldo de Paulo Lima');
		expect(auditTargetText({ ...base, target: 'account' })).toBe('Conta de Paulo Lima');
		expect(auditTargetText({ ...base, target: 'product', productName: 'Curso de pão' })).toBe(
			'Produto Curso de pão de Paulo Lima'
		);
	});

	it('names the refund, the payout and the ticket', () => {
		expect(
			auditTargetText({ kind: 'refund', studentName: 'Bia Rocha', productName: 'Curso de pão' })
		).toBe('Reembolso de Bia Rocha · Curso de pão');
		expect(auditTargetText({ kind: 'payout', userName: 'Paulo Lima' })).toBe('Saque de Paulo Lima');
		expect(
			auditTargetText({ kind: 'ticket', studentName: 'Bia Rocha', subject: 'Vídeo não abre' })
		).toBe('Chamado de Bia Rocha: Vídeo não abre');
	});

	it('says when the target is gone', () => {
		expect(auditTargetText(null)).toBe('Alvo não encontrado');
	});
});

describe('payoutsBannerTitle', () => {
	it('pluralizes pending payouts for the queue alert', () => {
		expect(payoutsBannerTitle(1)).toBe('1 saque aguardando revisão');
		expect(payoutsBannerTitle(3)).toBe('3 saques aguardando revisão');
	});
});

describe('formatHoursMetric', () => {
	it('formats missing, sub-hour and multi-hour medians in Portuguese', () => {
		expect(formatHoursMetric(null)).toBe('Sem dados');
		expect(formatHoursMetric(0)).toBe('0 min');
		expect(formatHoursMetric(0.5)).toBe('30 min');
		expect(formatHoursMetric(2)).toBe('2 h');
		expect(formatHoursMetric(3.5)).toBe('3,5 h');
	});
});

describe('pluralOrders', () => {
	it('formats order counts for chart tooltips and summaries', () => {
		expect(pluralOrders(0)).toBe('0 pedidos');
		expect(pluralOrders(1)).toBe('1 pedido');
		expect(pluralOrders(4)).toBe('4 pedidos');
	});
});
