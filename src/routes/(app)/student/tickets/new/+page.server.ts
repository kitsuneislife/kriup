import { fail, redirect } from '@sveltejs/kit';
import { ctx } from '#lib/server/app';
import { act, formText, requireUser } from '#lib/server/http';
import { listMyOrders } from '#lib/server/services/members';
import { openTicket, ticketSchema } from '#lib/server/services/support';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const orders = await listMyOrders(ctx, requireUser(locals).id);
	const wanted = url.searchParams.get('order');
	return {
		orders: orders.map(({ id, productName, createdAt, status }) => ({
			id,
			productName,
			createdAt,
			status
		})),
		// `?order=` preselects a purchase so other screens can link in; a foreign id is ignored
		preselected:
			orders.find((o) => o.id === wanted)?.id ?? (orders.length === 1 ? orders[0]!.id : '')
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const typed = Object.fromEntries(
			['orderId', 'subject', 'body'].map((key) => [key, formText(form, key)])
		);
		const opened = await act(() => openTicket(ctx, user.id, ticketSchema.parse(typed)));
		if (!opened.ok) return fail(opened.status, { ...opened.data, typed });
		redirect(303, `/student/tickets/${opened.value}`);
	}
};
