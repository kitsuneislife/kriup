import { describe, expect, it } from 'vitest';
import { barHeights, linePoints } from './scale';

describe('linePoints', () => {
	it('puts the highest value on top and spreads x evenly', () => {
		expect(linePoints([0, 10, 5], 100, 30, 0)).toEqual([
			[0, 30],
			[50, 0],
			[100, 15]
		]);
	});
	it('handles a flat line and a single point', () => {
		expect(linePoints([5, 5], 100, 30, 0).map(([, y]) => y)).toEqual([30, 30]);
		expect(linePoints([7], 100, 30, 0)).toEqual([[50, 30]]);
		expect(linePoints([], 100, 30)).toEqual([]);
	});
});

describe('barHeights', () => {
	it('scales to the highest value', () => {
		expect(barHeights([50, 100, 25])).toEqual([50, 100, 25]);
	});
	it('does not divide by zero', () => {
		expect(barHeights([0, 0])).toEqual([0, 0]);
		expect(barHeights([-5, 10])).toEqual([0, 100]);
	});
});
