import { fail } from '@sveltejs/kit';
import { ctx } from '#lib/server/app';
import { act, formText, orNotFound, requireSupport } from '#lib/server/http';
import { addTicketMessage, closeTicket, getTicket } from '#lib/server/services/support';
import type { Actions, PageServerLoad } from './$types';

// UC-06, RF-35. Support answers and closes any ticket; the close is audited (RF-62).
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireSupport(locals);
	const found = await orNotFound(getTicket(ctx, user, params.id));
	return {
		ticket: {
			id: found.ticket.id,
			subject: found.ticket.subject,
			status: found.ticket.status,
			createdAt: found.ticket.createdAt,
			closedAt: found.ticket.closedAt
		},
		student: found.student,
		product: found.product,
		messages: found.messages.map((m) => ({
			id: m.id,
			body: m.body,
			createdAt: m.createdAt,
			authorName: m.authorName,
			own: m.authorId === user.id
		}))
	};
};

export const actions: Actions = {
	send: async ({ locals, params, request }) => {
		const support = requireSupport(locals);
		const text = formText(await request.formData(), 'body');
		const sent = await act(() => addTicketMessage(ctx, support, params.id, text));
		return sent.ok ? { sent: true } : fail(sent.status, { ...sent.data, typed: text });
	},

	close: async ({ locals, params }) => {
		const support = requireSupport(locals);
		const closed = await act(() => closeTicket(ctx, support, params.id));
		return closed.ok ? { closed: true } : fail(closed.status, closed.data);
	}
};
