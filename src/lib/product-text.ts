// What the person reads for the type and the state of a product, in one place. Safe on the
// client: the server import is a type only.

import type { Pendency } from './domain/publish';
import type { offer, product } from './server/db/schema';
import type { IconName, Tone } from './ui';

type Product = typeof product.$inferSelect;
type Offer = typeof offer.$inferSelect;

export const productTypeText: Record<Product['type'], { label: string; icon: IconName }> = {
	course: { label: 'Curso', icon: 'book' },
	mentorship: { label: 'Mentoria', icon: 'users' },
	subscription: { label: 'Assinatura', icon: 'refresh' }
};

export const recurrenceText: Record<Offer['recurrence'], string> = {
	one_time: 'Pagamento único',
	monthly: 'Mensal'
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

type PageField = { label: string; long: boolean; rank: number };

// `rank` is the reading order: headings, then the numbered items, then the button.
const pageFields: Record<string, PageField> = {
	title: { label: 'Título', long: false, rank: 0 },
	subtitle: { label: 'Subtítulo', long: true, rank: 1 },
	subject: { label: 'Assunto', long: false, rank: 2 },
	text: { label: 'Texto', long: true, rank: 3 },
	body: { label: 'Mensagem', long: true, rank: 4 },
	cta: { label: 'Texto do botão de compra', long: false, rank: 10_000 },
	note: { label: 'Observação', long: true, rank: 10_001 }
};

// each question sits right before its answer
const numbered: [RegExp, string, boolean][] = [
	[/^item(\d+)$/, 'Item', false],
	[/^question(\d+)$/, 'Pergunta', false],
	[/^answer(\d+)$/, 'Resposta', true]
];

/** The label of a text field of a page section; `long` ones get several lines. */
export function pageFieldText(key: string): PageField {
	const named = pageFields[key];
	if (named) return named;
	for (const [i, [pattern, label, long]] of numbered.entries()) {
		const n = pattern.exec(key)?.[1];
		if (n) return { label: `${label} ${n}`, long, rank: 10 + Number(n) * numbered.length + i };
	}
	// a template with a field nobody named: fix the template or this list
	throw new Error(`page field without a label: ${key}`);
}

/** The text fields of a section in reading order; the database does not keep their order. */
export function inReadingOrder(keys: readonly string[]): string[] {
	return [...keys].sort((a, b) => pageFieldText(a).rank - pageFieldText(b).rank);
}

/** The fonts a producer can pick for the brand (RF-12). */
export const brandFonts = ['Inter', 'Roboto', 'Montserrat', 'Lora', 'Playfair Display'];
