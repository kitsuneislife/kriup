// What the person reads for the type and the state of a product, in one place. Safe on the
// client: the server import is a type only.

import type { Pendency } from './domain/publish';
import type { product } from './server/db/schema';
import type { IconName, Tone } from './ui';

type Product = typeof product.$inferSelect;

export const productTypeText: Record<Product['type'], { label: string; icon: IconName }> = {
	course: { label: 'Curso', icon: 'book' },
	mentorship: { label: 'Mentoria', icon: 'users' },
	subscription: { label: 'Assinatura', icon: 'refresh' }
};

export const productStatusText: Record<Product['status'], { label: string; tone: Tone }> = {
	draft: { label: 'Rascunho', tone: 'neutral' },
	published: { label: 'Publicado', tone: 'success' }
};

/** RF-15: what must be ready before publishing, in the order the editor shows it. */
export const pendencyText: Record<Pendency, string> = {
	sales_page: 'Página de venda preenchida',
	lesson: 'Pelo menos uma aula',
	offer: 'Pelo menos uma oferta',
	refund_policy: 'Política de reembolso'
};

/** The name of each kind of page section the templates draft (RF-13). */
export const sectionText: Record<string, string> = {
	hero: 'Abertura',
	benefits: 'Benefícios',
	guarantee: 'Garantia',
	faq: 'Perguntas frequentes',
	summary: 'Resumo da compra',
	email: 'E-mail de acesso'
};

const pageFields: Record<string, { label: string; long?: boolean }> = {
	title: { label: 'Título' },
	subtitle: { label: 'Subtítulo', long: true },
	cta: { label: 'Texto do botão de compra' },
	text: { label: 'Texto', long: true },
	note: { label: 'Observação', long: true },
	subject: { label: 'Assunto' },
	body: { label: 'Mensagem', long: true }
};

const numbered: [RegExp, string, boolean][] = [
	[/^item(\d+)$/, 'Item', false],
	[/^question(\d+)$/, 'Pergunta', false],
	[/^answer(\d+)$/, 'Resposta', true]
];

/** The label of a text field of a page section; `long` ones get several lines. */
export function pageFieldText(key: string): { label: string; long: boolean } {
	const named = pageFields[key];
	if (named) return { label: named.label, long: named.long ?? false };
	for (const [pattern, label, long] of numbered) {
		const n = pattern.exec(key)?.[1];
		if (n) return { label: `${label} ${n}`, long };
	}
	// a template with a field nobody named: fix the template or this list
	throw new Error(`page field without a label: ${key}`);
}

/** The fonts a producer can pick for the brand (RF-12). */
export const brandFonts = ['Inter', 'Roboto', 'Montserrat', 'Lora', 'Playfair Display'];
