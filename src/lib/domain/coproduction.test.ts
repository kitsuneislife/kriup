import { describe, expect, it } from 'vitest';
import { contractText } from './coproduction';

describe('contractText', () => {
	const terms = {
		productName: 'Curso de pão',
		producerName: 'Ana',
		coproducerName: 'Bia',
		coproducerEmail: 'bia@example.com',
		percentBp: 2_550,
		durationDays: 90,
		version: 2
	};

	it('states the version, percentage and duration', () => {
		const text = contractText(terms);
		expect(text).toContain('versão 2');
		expect(text).toContain('25,5%');
		expect(text).toContain('por 90 dias');
		expect(contractText({ ...terms, durationDays: null })).toContain('prazo indeterminado');
	});
});
import { termsInForce, withinShareLimit, type CoproductionTerm } from './coproduction';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('withinShareLimit', () => {
	it('allows up to 90% of the net in total (RN-12)', () => {
		expect(withinShareLimit([])).toBe(true);
		expect(withinShareLimit([4_500, 4_500])).toBe(true);
		expect(withinShareLimit([4_500, 4_501])).toBe(false);
	});

	it('rejects a malformed share', () => {
		expect(() => withinShareLimit([-1])).toThrow(RangeError);
		expect(() => withinShareLimit([12.5])).toThrow(RangeError);
	});
});

describe('termsInForce', () => {
	const ana25: CoproductionTerm = {
		coproducerId: 'ana',
		bp: 2_500,
		effectiveFrom: at('2026-03-01'),
		endsAt: at('2026-04-01')
	};
	const ana30: CoproductionTerm = {
		...ana25,
		bp: 3_000,
		effectiveFrom: at('2026-04-01'),
		endsAt: null
	};
	const bia: CoproductionTerm = {
		coproducerId: 'bia',
		bp: 1_000,
		effectiveFrom: at('2026-03-15'),
		endsAt: null
	};
	const terms = [ana25, ana30, bia];

	it('gives nothing to a sale before the acceptance (US-04)', () => {
		expect(termsInForce(terms, at('2026-02-28'))).toEqual([]);
	});

	it('starts at the acceptance instant', () => {
		expect(termsInForce(terms, ana25.effectiveFrom)).toEqual([ana25]);
	});

	it('applies a new percentage only to later sales (RN-12)', () => {
		expect(termsInForce(terms, at('2026-03-31'))).toEqual([ana25, bia]);
		expect(termsInForce(terms, at('2026-04-01'))).toEqual([ana30, bia]);
	});

	it('fails loudly on overlapping terms for one coproducer', () => {
		const overlap = { ...ana30, effectiveFrom: at('2026-03-20') };
		expect(() => termsInForce([ana25, overlap], at('2026-03-25'))).toThrow(/overlapping/);
	});

	it('fails loudly when the shares in force exceed the limit', () => {
		const big = { ...bia, bp: 7_000 };
		expect(() => termsInForce([ana25, big], at('2026-03-20'))).toThrow(/exceed/);
	});
});
