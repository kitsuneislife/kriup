import { describe, expect, it } from 'vitest';
import { isHexColor, normalizeHex } from './hex';

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
});
