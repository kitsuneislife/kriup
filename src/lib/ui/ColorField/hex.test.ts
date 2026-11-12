import { describe, expect, it } from 'vitest';
import { isHexColor, normalizeHex, textOn } from './hex';

describe('hex colors', () => {
	it('validates six digits', () => {
		expect(isHexColor('#0a84ff')).toBe(true);
		expect(isHexColor('#0a8')).toBe(false);
		expect(isHexColor('0a84ff')).toBe(false);
	});
	it('normalizes what people type', () => {
		expect(normalizeHex('0A84FF')).toBe('#0a84ff');
		expect(normalizeHex(' #0a8 ')).toBe('#00aa88');
		expect(normalizeHex('azul')).toBeUndefined();
	});
	it('picks the text color that reads on a brand color', () => {
		expect(textOn('#ffffff')).toBe('#000000');
		expect(textOn('#ffd60a')).toBe('#000000');
		expect(textOn('#000000')).toBe('#ffffff');
		expect(textOn('#c2410c')).toBe('#ffffff');
		// mid gray: both are close, black wins by a little
		expect(textOn('#777777')).toBe('#000000');
		expect(() => textOn('azul')).toThrow(RangeError);
	});
	it('picks for the darker shade a button paints', () => {
		// a mid blue reads black on its own color, but white once the button darkens it
		expect(textOn('#3b82f6')).toBe('#000000');
		expect(textOn('#3b82f6', 0.84)).toBe('#ffffff');
		expect(textOn('#ffd60a', 0.84)).toBe('#000000');
	});
});
