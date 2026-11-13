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
import { addRefundMessage, getRefund, producerDecision } from '#lib/server/services/refunds';
import type { Actions, PageServerLoad } from './$types';

// UC-05, RF-33, RN-08. getRefund answers any party of the request; only the producer's
// screen lives here, so the student and support get the same 404 as a stranger, and
// producerDecision checks the owner again. Approving is two steps without JavaScript:
// `?approve` shows the confirmation, the `approve` action writes it.
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = requireUser(locals);
	const found = await orNotFound(getRefund(ctx, user, params.id));
	if (found.viewerRole !== 'producer') error(404);
	return {
		userId: user.id,
		refund: found.refund,
		order: found.order,
		product: found.product,
		student: found.student,
		messages: found.messages,
		confirming: url.searchParams.has('approve'),
		now: new Date()
	};
};

/** Every answer says which form it is for, so the error shows on the form that sent it. */
const refuse = (
	target: string,
	failure: Exclude<Acted<unknown>, { ok: true }>,
	typed?: Record<string, string>
) =>
	fail(failure.status, { ...failure.data, for: target, typed } satisfies ActionFailure & {
		for: string;
		typed?: Record<string, string>;
	});

export const actions: Actions = {
	approve: async ({ locals, params }) => {
		const result = await act(() =>
			producerDecision(ctx, requireUser(locals).id, params.id, { decision: 'approve' })
		);
		return result.ok ? { for: 'approve' } : refuse('approve', result);
	},
	decline: async ({ locals, params, request }) => {
		const reason = formText(await request.formData(), 'reason');
		const result = await act(() =>
			producerDecision(ctx, requireUser(locals).id, params.id, { decision: 'decline', reason })
		);
		return result.ok ? { for: 'decline' } : refuse('decline', result, { reason });
	},
	message: async ({ locals, params, request }) => {
		const body = formText(await request.formData(), 'body');
		const result = await act(() => addRefundMessage(ctx, requireUser(locals), params.id, body));
		return result.ok ? { for: 'message' } : refuse('message', result, { body });
	}
};
