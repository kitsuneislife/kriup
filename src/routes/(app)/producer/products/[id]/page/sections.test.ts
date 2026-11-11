import { describe, expect, it } from 'vitest';
import { readSections, sectionHasError } from './sections';

const form = (entries: [string, string][]) => {
	const data = new FormData();
	for (const [name, value] of entries) data.append(name, value);
	return data;
};

const page: [string, string][] = [
	['sections.0.hero.title', 'Pão'],
	['sections.0.hero.image', ' '],
	['sections.0.hero.imageAlt', 'esquecida'],
	['sections.1.faq.question1', 'Quanto?'],
	['sections.1.faq.image', 'https://img.example/a.png'],
	['sections.1.faq.imageAlt', 'Uma pergunta'],
	['other', 'ignored']
];

describe('readSections', () => {
	it('reads each section as typed and drops an empty image', () => {
		expect(readSections(form(page))).toEqual([
			{ kind: 'hero', fields: { title: 'Pão' } },
			{
				kind: 'faq',
				fields: {
					question1: 'Quanto?',
					image: 'https://img.example/a.png',
					imageAlt: 'Uma pergunta'
				}
			}
		]);
	});

	it('moves a section after reading what was typed', () => {
		const sections = readSections(form([...page, ['move', '1:up']]));
		expect(sections.map((s) => s.kind)).toEqual(['faq', 'hero']);
		expect(readSections(form([...page, ['move', '0:up']])).map((s) => s.kind)).toEqual([
			'hero',
			'faq'
		]);
		expect(readSections(form([...page, ['move', 'x']])).map((s) => s.kind)).toEqual([
			'hero',
			'faq'
		]);
	});

	it('keeps a gap as an empty section, for the service to refuse', () => {
		const sections = readSections(form([['sections.2.hero.title', 'Pão']]));
		expect(sections).toHaveLength(3);
		expect(sections[0]).toEqual({ kind: '', fields: {} });
	});
});

describe('sectionHasError', () => {
	it('finds the errors of one section only', () => {
		const errors = { 'sections.1.fields.title': 'Preencha este campo.' };
		expect(sectionHasError(errors, 1)).toBe(true);
		expect(sectionHasError(errors, 0)).toBe(false);
		expect(sectionHasError({ 'sections.10.fields.title': 'x' }, 1)).toBe(false);
	});
});
