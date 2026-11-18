import { describe, expect, it } from 'vitest';
import { currentRoute, homeRoute, sections } from './nav';

describe('homeRoute', () => {
	it('opens the first screen of each profile', () => {
		expect(homeRoute('producer')).toBe('/(app)/producer');
		expect(homeRoute('student')).toBe('/(app)/student');
		expect(homeRoute('coproducer')).toBe('/(app)/coproductions');
		expect(homeRoute('support')).toBe('/(app)/support');
	});

	it('places support metrics right after the queue', () => {
		const support = sections.find((s) => s.profile === 'support');
		expect(support?.items.map((item) => [item.route, item.label, item.icon])).toEqual([
			['/(app)/support', 'Fila', 'shield'],
			['/(app)/support/metrics', 'Métricas', 'trending'],
			['/(app)/support/payouts', 'Saques', 'wallet'],
			['/(app)/support/blocks', 'Bloqueios', 'lock'],
			['/(app)/support/audit', 'Auditoria', 'list']
		]);
	});
});

describe('currentRoute', () => {
	const routes = [
		'/(app)/producer',
		'/(app)/producer/money',
		'/(app)/student',
		'/(app)/support',
		'/(app)/support/metrics'
	];

	it('marks the item of the page and of the pages under it', () => {
		expect(currentRoute('/(app)/producer', routes)).toBe('/(app)/producer');
		expect(currentRoute('/(app)/producer/products/[id]', routes)).toBe('/(app)/producer');
	});

	it('prefers the deepest item', () => {
		expect(currentRoute('/(app)/producer/money/statement', routes)).toBe('/(app)/producer/money');
		expect(currentRoute('/(app)/support/metrics', routes)).toBe('/(app)/support/metrics');
	});

	it('does not confuse a route that only starts with the same letters', () => {
		expect(currentRoute('/(app)/students', routes)).toBeUndefined();
		expect(currentRoute('/(app)/account', routes)).toBeUndefined();
	});

	it('marks nothing on a page without a route, like a 404', () => {
		expect(currentRoute(null, routes)).toBeUndefined();
	});
});
