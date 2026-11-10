import { assertBp, assertDate } from './money';
import { COPRODUCTION_MAX_BP } from './params';

/**
 * One accepted version of a coproduction contract (RN-12). It starts at the acceptance
 * and ends when a new percentage is accepted, the duration runs out or it is closed.
 */
export interface CoproductionTerm {
	coproducerId: string;
	bp: number;
	effectiveFrom: Date;
	/** Exclusive; null while open-ended. */
	endsAt: Date | null;
}

export interface ContractTerms {
	productName: string;
	producerName: string;
	coproducerName: string;
	coproducerEmail: string;
	percentBp: number;
	/** Null means no end date. */
	durationDays: number | null;
	version: number;
}

/**
 * RF-51: the contract the coproducer accepts. The text is stored with the invite and its
 * hash with the acceptance, so the version accepted can always be shown again.
 */
export function contractText(terms: Readonly<ContractTerms>): string {
	assertBp('percentBp', terms.percentBp);
	const percent = (terms.percentBp / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
	const duration =
		terms.durationDays === null
			? 'por prazo indeterminado, até que uma nova versão seja aceita'
			: `por ${terms.durationDays} dias a partir do aceite`;
	return [
		`Contrato de coprodução, versão ${terms.version}`,
		'',
		`Produto: ${terms.productName}`,
		`Produtor: ${terms.producerName}`,
		`Coprodutor: ${terms.coproducerName} (${terms.coproducerEmail})`,
		'',
		`1. O coprodutor recebe ${percent}% do valor líquido de cada venda do produto, isto é, do valor pago menos a taxa da plataforma. O valor é arredondado para baixo, em centavos, e o produtor recebe o restante.`,
		`2. A divisão vale ${duration}, e só para vendas pagas depois do aceite.`,
		'3. Cada parte recebe sua parte no próprio extrato, retida até o fim da garantia da venda.',
		'4. Em caso de reembolso, cada parte devolve sua parte na mesma proporção da venda.',
		'5. Uma mudança de percentual exige um novo aceite e vale só para vendas posteriores.'
	].join('\n');
}

/** RN-12: the combined share of a product's coproducers stays within the limit. */
export function withinShareLimit(bps: readonly number[]): boolean {
	let total = 0;
	for (const bp of bps) {
		assertBp('bp', bp);
		total += bp;
	}
	return total <= COPRODUCTION_MAX_BP;
}

/**
 * Terms of one product that apply to a sale paid at `at`. A sale before the acceptance
 * gets nothing, and a percentage change only applies to later sales (RN-12, US-04).
 * Throws on data that breaks RN-12: two terms for one coproducer, or shares over the limit.
 */
export function termsInForce<T extends CoproductionTerm>(terms: readonly T[], at: Date): T[] {
	assertDate('at', at);
	const inForce = terms.filter((term) => {
		assertDate('effectiveFrom', term.effectiveFrom);
		if (term.endsAt !== null) assertDate('endsAt', term.endsAt);
		return term.effectiveFrom <= at && (term.endsAt === null || at < term.endsAt);
	});

	const coproducers = new Set(inForce.map((term) => term.coproducerId));
	if (coproducers.size !== inForce.length) {
		throw new Error('a coproducer has overlapping terms in force');
	}
	if (!withinShareLimit(inForce.map((term) => term.bp))) {
		throw new Error(`coproducer shares in force exceed ${COPRODUCTION_MAX_BP} bp`);
	}
	return inForce;
}
