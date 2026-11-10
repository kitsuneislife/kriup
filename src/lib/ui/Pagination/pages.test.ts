import { describe, expect, it } from 'vitest';
import { visiblePages } from './pages';

describe('visiblePages', () => {
	it('shows every page when there are few', () => {
		expect(visiblePages(2, 5)).toEqual([1, 2, 3, 4, 5]);
	});
	it('skips pages in the middle', () => {
		expect(visiblePages(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
	});
	it('does not skip next to the edges', () => {
		expect(visiblePages(1, 20)).toEqual([1, 2, null, 20]);
		expect(visiblePages(20, 20)).toEqual([1, null, 19, 20]);
		expect(visiblePages(3, 20)).toEqual([1, 2, 3, 4, null, 20]);
	});
});
