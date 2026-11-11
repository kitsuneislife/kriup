import { describe, expect, it } from 'vitest';
import { formatDate, formatDecimal, formatMoney, parseCents, parseReais } from './format';

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

describe('parseReais', () => {
	it('reads reais with an optional comma and thousands dots', () => {
		expect(parseReais('97')).toBe(9700);
		expect(parseReais('97,9')).toBe(9790);
		expect(parseReais(' 97,90 ')).toBe(9790);
		expect(parseReais('1.234,56')).toBe(123456);
		expect(parseReais('1234,56')).toBe(123456);
		expect(parseReais('R$ 1.000')).toBe(100000);
	});
	it('refuses what is not a price', () => {
		for (const text of ['', 'abc', '97.90', '97,901', '1.23,00', '-5', '1,', ',50']) {
			expect(parseReais(text), text).toBeUndefined();
		}
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
