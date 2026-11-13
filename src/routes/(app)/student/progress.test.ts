import { describe, expect, it } from 'vitest';
import { percent, progressText } from './progress';

describe('percent', () => {
	it('rounds down and never divides by zero', () => {
		expect(percent(0, 0)).toBe(0);
		expect(percent(1, 3)).toBe(33);
		expect(percent(2, 3)).toBe(66);
		expect(percent(3, 3)).toBe(100);
	});
});

describe('progressText', () => {
	it('agrees with the number of lessons', () => {
		expect(progressText(0, 0)).toBe('Ainda sem aulas');
		expect(progressText(0, 1)).toBe('0 de 1 aula concluída');
		expect(progressText(3, 8)).toBe('3 de 8 aulas concluídas');
	});
});
