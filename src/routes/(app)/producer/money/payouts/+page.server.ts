import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { errorText, invalidMoneyText } from '#lib/error-text';
import { ctx } from '#lib/server/app';
import { act, formText, requireUser } from '#lib/server/http';
import { assertNotBlocked } from '#lib/server/services/blocks';
import { getMoneyPanel, previewPayout, requestPayout } from '#lib/server/services/money';
import { parseReais } from '#lib/ui/format';
import type { Actions, PageServerLoad } from './$types';

// UC-07, RF-44, RF-45, RN-13. Everything is the signed-in user's own: the services take
// the id from the session, so there is no other person's payout to reach. Two steps that
// work without JavaScript: `preview` shows the fee, `confirm` writes the request.
export const load: PageServerLoad = async ({ locals, url }) => {
	const panel = await getMoneyPanel(ctx, requireUser(locals).id);
	return {
		releasedCents: panel.balance.releasedCents,
		blocks: panel.blocks,
		refusal: panel.payout.refusal,
		minCents: panel.payout.minCents,
		payouts: panel.payouts,
		requested: url.searchParams.has('requested')
	};
};

export const actions: Actions = {
	preview: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		const amount = formText(await request.formData(), 'amount');
		const cents = parseReais(amount);
		if (cents === undefined || cents <= 0) {
			return fail(400, {
				code: 'invalid_input' as const,
				amount,
				fields: { amount: invalidMoneyText }
			});
		}
		const result = await act(async () => {
			await assertNotBlocked(ctx.db, userId, ['balance'], null);
			return previewPayout(ctx, userId, cents);
		});
		if (!result.ok) return fail(result.status, { ...result.data, amount });
		const quote = result.value;
		if (!quote.ok) {
			// the amount is what is wrong, except a negative balance, which is not the field's fault
			return fail(400, {
				code: quote.reason,
				amount,
				fields:
					quote.reason === 'negative_balance' ? undefined : { amount: errorText(quote.reason) }
			});
		}
		return { amount, preview: quote };
	},

	confirm: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		const cents = Number(formText(await request.formData(), 'amountCents'));
		const result = await act(() => requestPayout(ctx, userId, cents));
		if (!result.ok) return fail(result.status, { ...result.data });
		redirect(303, `${resolve('/(app)/producer/money/payouts')}?requested`);
	}
};
