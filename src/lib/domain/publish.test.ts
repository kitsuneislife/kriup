import { expect, it } from 'vitest';
import { isPageFilled, publishPendencies } from './publish';

it('counts a page as filled with a section and no blank field', () => {
	expect(isPageFilled({ sections: [] })).toBe(false);
	expect(isPageFilled({ sections: [{ fields: { title: ' ' } }] })).toBe(false);
	expect(isPageFilled({ sections: [{ fields: { title: 'Pão' } }] })).toBe(true);
});

const ready = {
	offerCount: 1,
	lessonCount: 3,
	refundPolicy: 'Reembolso em 7 dias.',
	salesPageFilled: true
};

it('is ready to publish with nothing missing (RN-01)', () => {
	expect(publishPendencies(ready)).toEqual([]);
});

it('lists everything that is missing', () => {
	expect(
		publishPendencies({ offerCount: 0, lessonCount: 0, refundPolicy: '  ', salesPageFilled: false })
	).toEqual(['offer', 'lesson', 'refund_policy', 'sales_page']);
});
