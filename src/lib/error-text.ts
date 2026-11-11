// Every error text the person reads, in one place (convencoes.md section 1). Services
// refuse with a stable code (DomainErrorCode) or invalid input (Zod issues); this file is
// the only one that turns them into Portuguese. Safe on the client: no server imports.

import type { z } from 'zod';
import { PAYOUT_MIN_CENTS } from './domain/params';
import type { DomainErrorCode } from './domain/states';
import { formatMoney } from './ui/format';

/** What a form action answers when it refuses: a domain rule or invalid fields. */
export type ErrorCode = DomainErrorCode | 'invalid_input';

const errors = {
	invalid_input: 'Revise os campos destacados.',
	invalid_transition: 'Isso mudou enquanto a página estava aberta. Atualize e tente de novo.',
	decline_reason_required: 'Explique ao aluno o motivo da recusa.',
	not_your_turn: 'Esta decisão não está com você agora.',
	deadline_passed: 'O prazo para decidir terminou e o pedido foi para a plataforma.',
	deadline_not_passed: 'O prazo do produtor ainda não terminou.',
	already_contested: 'Este reembolso já foi contestado uma vez.',
	not_contestable: 'Só um reembolso recusado pode ser contestado.',
	refund_exists: 'Já existe um pedido de reembolso para esta compra.',
	order_not_refundable: 'Esta compra não pode ser reembolsada.',
	publish_pendencies: 'Resolva as pendências antes de publicar.',
	blocked: 'Bloqueado pelo suporte. O aviso da página diz o motivo e o que fazer.',
	product_unavailable: 'Este produto não está disponível.',
	recurrence_not_supported: 'Assinaturas ainda não estão disponíveis. Use pagamento único.',
	offer_has_orders: 'Esta oferta já tem pedidos e não pode ser apagada.',
	already_invited: 'Esta pessoa já foi convidada para este produto.',
	share_limit: 'A soma das partes dos coprodutores passa do limite.',
	self_coproduction: 'Você não pode ser coprodutor do seu próprio produto.',
	negative_balance: 'Seu saldo está negativo. O saque volta quando ele for coberto.',
	below_minimum: `O saque mínimo é de ${formatMoney(PAYOUT_MIN_CENTS)}.`,
	insufficient_balance: 'O valor passa do seu saldo liberado.',
	invalid_token: 'Este link é inválido ou expirou. Peça um novo.',
	email_taken: 'Já existe uma conta com este e-mail. Entre ou recupere a senha.',
	invalid_credentials: 'E-mail ou senha incorretos.'
} satisfies Record<ErrorCode, string>;

export function errorText(code: ErrorCode): string {
	return errors[code];
}

/** Codes a schema puts in a custom issue (`params.code`), for rules Zod has no name for. */
const custom: Record<string, string> = {
	invalid_tax_id: 'CPF ou CNPJ inválido.',
	invalid_price: 'Informe o valor em reais, como 97,90.'
};

/** The text under a field for one Zod issue. */
export function issueText(issue: z.core.$ZodIssue): string {
	switch (issue.code) {
		case 'invalid_type':
			return issue.input === undefined ? 'Preencha este campo.' : 'Valor inválido.';
		case 'too_small':
			if (issue.origin !== 'string') return 'Valor abaixo do mínimo.';
			return Number(issue.minimum) <= 1
				? 'Preencha este campo.'
				: `Use pelo menos ${issue.minimum} caracteres.`;
		case 'too_big':
			return issue.origin === 'string'
				? `Use no máximo ${issue.maximum} caracteres.`
				: 'Valor acima do máximo.';
		case 'invalid_format':
			if (issue.format === 'email') return 'Informe um e-mail válido.';
			if (issue.format === 'url') return 'Informe o endereço completo, com https://.';
			return 'Formato inválido.';
		case 'invalid_value':
			return 'Escolha uma das opções.';
		case 'custom': {
			const code = issue.params?.code;
			return (typeof code === 'string' && custom[code]) || 'Valor inválido.';
		}
		default:
			return 'Valor inválido.';
	}
}
