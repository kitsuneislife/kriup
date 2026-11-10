export type Pendency = 'offer' | 'lesson' | 'refund_policy' | 'sales_page';

export interface PublishDraft {
	offerCount: number;
	lessonCount: number;
	refundPolicy: string;
	salesPageFilled: boolean;
}

/** RN-01: what is missing before a product can be published; empty means ready (RF-15). */
export function publishPendencies(draft: Readonly<PublishDraft>): Pendency[] {
	const pendencies: Pendency[] = [];
	if (draft.offerCount < 1) pendencies.push('offer');
	if (draft.lessonCount < 1) pendencies.push('lesson');
	if (draft.refundPolicy.trim() === '') pendencies.push('refund_policy');
	if (!draft.salesPageFilled) pendencies.push('sales_page');
	return pendencies;
}
