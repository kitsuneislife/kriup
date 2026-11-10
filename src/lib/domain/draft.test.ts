import { describe, expect, it } from 'vitest';
import { fillDeep, fillText } from './draft';

describe('fillText', () => {
	it('replaces every placeholder, spaces allowed', () => {
		expect(
			fillText('{{productName}} para {{ audience }}', { productName: 'Pão', audience: 'todos' })
		).toBe('Pão para todos');
	});

	it('throws on a placeholder without a value', () => {
		expect(() => fillText('{{missing}}', {})).toThrow(/missing/);
	});
});

describe('fillDeep', () => {
	it('fills strings at any depth and keeps the shape', () => {
		const filled = fillDeep(
			{ sections: [{ kind: 'hero', fields: { title: '{{productName}}' } }], n: 1, x: null },
			{ productName: 'Pão' }
		);
		expect(filled).toEqual({
			sections: [{ kind: 'hero', fields: { title: 'Pão' } }],
			n: 1,
			x: null
		});
	});
});
