import { describe, expect, it } from 'vitest';
import { inReadingOrder, pageFieldText, recurrenceText } from './product-text';

describe('recurrence text', () => {
	it('names one-time and monthly billing in Portuguese', () => {
		expect(recurrenceText).toEqual({
			one_time: 'Pagamento único',
			monthly: 'Mensal'
		});
	});
});

describe('page fields', () => {
	it('names the numbered fields', () => {
		expect(pageFieldText('question2')).toMatchObject({ label: 'Pergunta 2', long: false });
		expect(pageFieldText('answer2')).toMatchObject({ label: 'Resposta 2', long: true });
		expect(() => pageFieldText('mystery')).toThrow('mystery');
	});

	it('puts the fields in reading order', () => {
		expect(
			inReadingOrder(['cta', 'answer2', 'title', 'question2', 'answer1', 'question1'])
		).toEqual(['title', 'question1', 'answer1', 'question2', 'answer2', 'cta']);
		expect(inReadingOrder(['item10', 'item2', 'subtitle'])).toEqual([
			'subtitle',
			'item2',
			'item10'
		]);
	});
});
