import { describe, expect, it } from 'vitest';
import { formatDate, formatDecimal, formatMoney, parseCents } from './format';

const clean = (text: string) => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
	it('formats cents as BRL', () => {
		expect(clean(formatMoney(123456))).toBe('R$ 1.234,56');
		expect(clean(formatMoney(5))).toBe('R$ 0,05');
		expect(clean(formatMoney(-1990))).toBe('-R$ 19,90');
	});
	it('rejects fractions', () => {
		expect(() => formatMoney(10.5)).toThrow(RangeError);
	});
	it('formats without symbol', () => {
		expect(formatDecimal(123456)).toBe('1.234,56');
	});
});

describe('parseCents', () => {
	it('reads digits as cents', () => {
		expect(parseCents('')).toBe(0);
		expect(parseCents('1.234,5')).toBe(12345);
		expect(parseCents('abc')).toBe(0);
	});
	it('caps at the maximum', () => {
		expect(parseCents('99999999999999', 1000)).toBe(1000);
	});
});

describe('formatDate', () => {
	const date = new Date('2026-11-10T15:30:00Z');
	it('shows São Paulo time', () => {
		expect(formatDate(date, 'time')).toBe('12:30');
		expect(formatDate(date, 'date')).toContain('2026');
	});
	it('formats relative time', () => {
		const now = new Date('2026-11-10T15:30:00Z');
		expect(formatDate(new Date('2026-11-13T15:30:00Z'), 'relative', now)).toBe('em 3 dias');
		expect(formatDate(new Date('2026-11-10T13:30:00Z'), 'relative', now)).toBe('há 2 horas');
	});
});
