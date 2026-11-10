import { expect, it } from 'vitest';
import { publishPendencies } from './publish';

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
