import { error, fail } from '@sveltejs/kit';
import { ctx } from '#lib/server/app';
import {
	act,
	formText,
	orNotFound,
	requireUser,
	type Acted,
	type ActionFailure
} from '#lib/server/http';
import { addRefundMessage, contestRefund, getRefund } from '#lib/server/services/refunds';
import type { Actions, PageServerLoad } from './$types';

// RF-31, RN-09. getRefund answers any party of the request; only the student's own screen
// lives here, so the producer and support get the same 404 as a stranger.
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const found = await orNotFound(getRefund(ctx, user, params.id));
	if (found.viewerRole !== 'student') error(404);
	return {
		userId: user.id,
		refund: found.refund,
		order: found.order,
		product: found.product,
		messages: found.messages
	};
};

/** Every answer says which form it is for, so the error shows on the form that sent it. */
const refuse = (target: string, failure: Exclude<Acted<unknown>, { ok: true }>) =>
	fail(failure.status, { ...failure.data, for: target } satisfies ActionFailure & { for: string });

export const actions: Actions = {
	message: async ({ locals, params, request }) => {
		const body = formText(await request.formData(), 'body');
		const result = await act(() => addRefundMessage(ctx, requireUser(locals), params.id, body));
		return result.ok ? { for: 'message' } : refuse('message', result);
	},
	contest: async ({ locals, params }) => {
		const result = await act(() => contestRefund(ctx, requireUser(locals).id, params.id));
		return result.ok ? { for: 'contest' } : refuse('contest', result);
	}
};
