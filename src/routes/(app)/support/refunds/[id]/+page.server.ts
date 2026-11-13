import { fail } from '@sveltejs/kit';
import { ctx } from '#lib/server/app';
import {
	act,
	formText,
	orNotFound,
	requireSupport,
	type Acted,
	type ActionFailure
} from '#lib/server/http';
import { addRefundMessage, getRefund, supportDecision } from '#lib/server/services/refunds';
import type { Actions, PageServerLoad } from './$types';

// UC-06, RN-08, RN-09. Support reads any request; it decides only the ones with the
// platform, and supportDecision checks the role and the state again (audited, RF-62).
// Approving is two steps without JavaScript: `?approve` shows the confirmation, the
// `approve` action writes it.
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = requireSupport(locals);
	const found = await orNotFound(getRefund(ctx, user, params.id));
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
		const support = requireSupport(locals);
		const result = await act(() =>
			supportDecision(ctx, support.id, params.id, { decision: 'approve' })
		);
		return result.ok ? { for: 'approve' } : refuse('approve', result);
	},
	decline: async ({ locals, params, request }) => {
		const support = requireSupport(locals);
		const reason = formText(await request.formData(), 'reason');
		const result = await act(() =>
			supportDecision(ctx, support.id, params.id, { decision: 'decline', reason })
		);
		return result.ok ? { for: 'decline' } : refuse('decline', result, { reason });
	},
	message: async ({ locals, params, request }) => {
		const support = requireSupport(locals);
		const body = formText(await request.formData(), 'body');
		const result = await act(() => addRefundMessage(ctx, support, params.id, body));
		return result.ok ? { for: 'message' } : refuse('message', result, { body });
	}
};
