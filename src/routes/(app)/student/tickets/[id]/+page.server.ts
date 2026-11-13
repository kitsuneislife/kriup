import { fail } from '@sveltejs/kit';
import { ctx } from '#lib/server/app';
import { act, formText, orNotFound, requireUser } from '#lib/server/http';
import { addTicketMessage, closeTicket, getTicket } from '#lib/server/services/support';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const { ticket, messages } = await orNotFound(getTicket(ctx, user, params.id));
	return {
		ticket: {
			id: ticket.id,
			subject: ticket.subject,
			status: ticket.status,
			createdAt: ticket.createdAt
		},
		messages: messages.map((m) => ({
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
		const user = requireUser(locals);
		const text = formText(await request.formData(), 'body');
		const sent = await act(() => addTicketMessage(ctx, user, params.id, text));
		return sent.ok ? { sent: true } : fail(sent.status, { ...sent.data, typed: text });
	},

	close: async ({ locals, params }) => {
		const closed = await act(() => closeTicket(ctx, requireUser(locals), params.id));
		return closed.ok ? { closed: true } : fail(closed.status, closed.data);
	}
};
