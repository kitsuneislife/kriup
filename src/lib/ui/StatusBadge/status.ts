import type { Tone } from '../types';

/**
 * Every state of an order, a refund and a ledger entry (docs/produto/regras-de-negocio.md).
 * The tone follows the color meaning in docs/design/cores.md: green paid or released, orange
 * waiting or retained, red failed, indigo refund, blue withdrawn.
 */
export const statusTone = {
	// order
	aguardando: 'warning',
	pago: 'success',
	expirado: 'neutral',
	recusado: 'danger',
	reembolsado: 'indigo',
	// refund
	aberto: 'warning',
	aprovado: 'indigo',
	com_produtor: 'warning',
	com_plataforma: 'warning',
	recusado_final: 'danger',
	concluido: 'indigo',
	// ledger
	retido: 'warning',
	liberado: 'success',
	sacado: 'accent',
	estornado: 'indigo'
} as const satisfies Record<string, Tone>;

export type Status = keyof typeof statusTone;
