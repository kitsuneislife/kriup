import { describe, expect, it } from 'vitest';
import { parseStatementQuery } from './statement-filters';

const parse = (query: string) => parseStatementQuery(new URLSearchParams(query));
const ID = '4f9d6c1e-3a52-4f6e-9a47-2b8f6f3b7c10';

describe('parseStatementQuery', () => {
	it('reads an empty query as no filter', () => {
		const q = parse('');
		expect(q.filters).toEqual({ page: 1 });
		expect(q.ignored).toBe(false);
	});

	it('reads every filter; the end day is inclusive and counted in Sao Paulo', () => {
		const q = parse(`product=${ID}&state=held&from=2026-03-01&to=2026-03-31&page=3`);
		expect(q.filters.productId).toBe(ID);
		expect(q.filters.state).toBe('held');
		expect(q.filters.from?.toISOString()).toBe('2026-03-01T03:00:00.000Z');
		expect(q.filters.to?.toISOString()).toBe('2026-04-01T03:00:00.000Z');
		expect(q.filters.page).toBe(3);
		expect(q.values).toEqual({ product: ID, state: 'held', from: '2026-03-01', to: '2026-03-31' });
		expect(q.ignored).toBe(false);
	});

	it.each([
		['product=abc'],
		['state=nope'],
		['from=ontem'],
		['to=2026-02-31'],
		['page=0'],
		['page=-2'],
		['page=1.5'],
		['page=abc']
	])('drops %s and says so', (query) => {
		const q = parse(query);
		expect(q.filters).toEqual({ page: 1 });
		expect(q.ignored).toBe(true);
	});

	it('drops a period that ends before it starts', () => {
		const q = parse('from=2026-03-10&to=2026-03-01');
		expect(q.filters.from).toBeUndefined();
		expect(q.filters.to).toBeUndefined();
		expect(q.ignored).toBe(true);
	});
});
