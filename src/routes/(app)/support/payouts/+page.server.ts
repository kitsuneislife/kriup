import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { act, formText, requireSupport, type ActionFailure } from '#lib/server/http';
import { completePayout, declinePayout, listPendingPayouts } from '#lib/server/services/money';
import type { Actions, PageServerLoad } from './$types';

// RF-44, decision F2: support pays the requested payouts here, oldest first. Two steps that
// work without JavaScript: `?complete=<id>` and `?decline=<id>` open the confirmation on the
// payout's card; with JavaScript it opens in a Dialog. The layout answers 404 to anyone
// else, and each action checks it again (the service too, in its audit).
export const load: PageServerLoad = async ({ locals, url }) => {
	const payouts = await listPendingPayouts(ctx, requireSupport(locals));
	return {
		payouts,
		completing: url.searchParams.get('complete'),
		declining: url.searchParams.get('decline'),
		done: url.searchParams.has('completed')
			? ('completed' as const)
			: url.searchParams.has('declined')
				? ('declined' as const)
				: undefined
	};
};

const here = () => resolve('/(app)/support/payouts');

export const actions: Actions = {
	complete: async ({ locals, request }) => {
		const supportId = requireSupport(locals).id;
		const id = formText(await request.formData(), 'id');
		const result = await act(() => completePayout(ctx, supportId, id));
		if (!result.ok) {
			return fail(result.status, { ...result.data, for: id, kind: 'complete' as const });
		}
		redirect(303, `${here()}?completed`);
	},

	decline: async ({ locals, request }) => {
		const supportId = requireSupport(locals).id;
		const data = await request.formData();
		const id = formText(data, 'id');
		const reason = formText(data, 'reason');
		const result = await act(() => declinePayout(ctx, supportId, id, reason));
		if (!result.ok) {
			return fail(result.status, {
				...result.data,
				for: id,
				kind: 'decline' as const,
				reason
			} satisfies ActionFailure & { for: string; kind: 'decline'; reason: string });
		}
		redirect(303, `${here()}?declined`);
	}
};
