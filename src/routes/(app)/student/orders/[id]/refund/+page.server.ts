import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { resolve } from '$app/paths';
import { isWithinGuarantee } from '#lib/domain/retention';
import { ctx } from '#lib/server/app';
import { act, formText, requireUser } from '#lib/server/http';
import { listMyOrders } from '#lib/server/services/members';
import { requestRefund } from '#lib/server/services/refunds';
import type { Actions, PageServerLoad } from './$types';

// UC-04, RF-30 to RF-32. The order must be the student's own: a foreign or malformed id
// is a 404. An order that already has a request, or is not paid, has nothing to ask.
export const load: PageServerLoad = async ({ locals, params }) => {
	const id = z.uuid().safeParse(params.id);
	if (!id.success) error(404);
	const order = (await listMyOrders(ctx, requireUser(locals).id)).find((o) => o.id === id.data);
	if (!order) error(404);
	if (order.refundId) redirect(303, resolve('/(app)/student/refunds/[id]', { id: order.refundId }));
	if (order.status !== 'paid' || !order.paidAt) redirect(303, resolve('/(app)/student/orders'));
	return {
		order: { id: order.id, productName: order.productName, grossCents: order.grossCents },
		withinGuarantee: isWithinGuarantee(order.paidAt, new Date(), order.guaranteeDays)
	};
};

export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		const reason = formText(await request.formData(), 'reason');
		const result = await act(() =>
			requestRefund(ctx, requireUser(locals).id, { orderId: params.id, reason })
		);
		if (!result.ok) return fail(result.status, { ...result.data, reason });
		redirect(303, resolve('/(app)/student/refunds/[id]', { id: result.value }));
	}
};
