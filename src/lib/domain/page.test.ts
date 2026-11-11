import { describe, expect, it } from 'vitest';
import { keepsSections, move, textFields } from './page';

const hero = { kind: 'hero', fields: { title: 'Pão', cta: 'Comprar' } };
const faq = { kind: 'faq', fields: { question1: 'Quanto?', answer1: 'Pouco' } };

describe('textFields', () => {
	it('leaves the image out', () => {
		expect(textFields({ kind: 'hero', fields: { title: 'a', image: 'b', imageAlt: 'c' } })).toEqual(
			['title']
		);
	});
});

describe('keepsSections', () => {
	it('accepts a new order, new texts and an image', () => {
		const edited = {
			kind: 'hero',
			fields: { cta: 'Já', title: 'Outro', image: 'https://x/y.png' }
		};
		expect(keepsSections([hero, faq], [faq, edited])).toBe(true);
	});

	it('refuses a section or a field the template did not have', () => {
		expect(keepsSections([hero, faq], [hero])).toBe(false);
		expect(keepsSections([hero], [hero, hero])).toBe(false);
		expect(keepsSections([hero], [{ kind: 'pitch', fields: hero.fields }])).toBe(false);
		expect(keepsSections([hero], [{ kind: 'hero', fields: { title: 'Pão' } }])).toBe(false);
		expect(keepsSections([hero], [{ kind: 'hero', fields: { ...hero.fields, x: '1' } }])).toBe(
			false
		);
	});
});

describe('move', () => {
	it('swaps with the neighbour and keeps the original', () => {
		const items = ['a', 'b', 'c'];
		expect(move(items, 1, 'up')).toEqual(['b', 'a', 'c']);
		expect(move(items, 1, 'down')).toEqual(['a', 'c', 'b']);
		expect(items).toEqual(['a', 'b', 'c']);
	});

	it('stays put at the ends and out of range', () => {
		expect(move(['a', 'b'], 0, 'up')).toEqual(['a', 'b']);
		expect(move(['a', 'b'], 1, 'down')).toEqual(['a', 'b']);
		expect(move(['a', 'b'], 5, 'up')).toEqual(['a', 'b']);
	});
});
