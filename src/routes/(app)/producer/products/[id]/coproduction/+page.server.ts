import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { parsePercent, simulateSale } from '#lib/domain/simulation';
import { ctx } from '#lib/server/app';
import { act, formText, orNotFound, requireUser, type ActionFailure } from '#lib/server/http';
import { getProductEditor } from '#lib/server/services/catalog';
import {
	cancelInvite,
	inviteCoproducer,
	listProductCoproductions
} from '#lib/server/services/coproduction';
import { answer, idOf } from '../answer';
import type { Actions, PageServerLoad } from './$types';

// RF-50 to RF-52, UC-08. Another producer's product, or a malformed id, answers 404.
// The simulation is a GET form (`?percent=30&offer=…`), so it works without JavaScript.
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = requireUser(locals);
	const editor = await orNotFound(getProductEditor(ctx, user.id, params.id));
	const terms = await orNotFound(listProductCoproductions(ctx, user.id, params.id));

	const offers = editor.offers.map(({ id, name, priceCents }) => ({ id, name, priceCents }));
	const offer = offers.find((o) => o.id === url.searchParams.get('offer')) ?? offers[0];
	const percentText = url.searchParams.get('percent') ?? '';
	const percentBp = percentText ? parsePercent(percentText) : undefined;
	return {
		product: { name: editor.product.name },
		offers,
		terms,
		simulation: {
			percentText,
			offerId: offer?.id ?? '',
			invalid: percentText !== '' && percentBp === undefined,
			sale: offer && percentBp !== undefined ? simulateSale(offer.priceCents, percentBp) : null
		}
	};
};

/** The invite as typed: the percentage in percent, the duration in days or empty for none. */
const inviteForm = z.object({
	email: z.string(),
	name: z.string(),
	percent: z.string().transform((text, issue) => {
		const bp = parsePercent(text);
		if (bp === undefined) {
			issue.addIssue({
				code: 'custom',
				message: 'not a percentage',
				params: { code: 'invalid_percent' }
			});
			return z.NEVER;
		}
		return bp;
	}),
	durationDays: z
		.string()
		.trim()
		.transform((text) => (text === '' ? null : Number(text)))
});

const typedKeys = ['email', 'name', 'percent', 'durationDays'];

export const actions: Actions = {
	invite: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		if (!z.uuid().safeParse(params.id).success) error(404);
		const form = await request.formData();
		const typed = Object.fromEntries(typedKeys.map((key) => [key, formText(form, key)]));
		const result = await act(async () => {
			const { percent, ...rest } = inviteForm.parse(typed);
			return inviteCoproducer(ctx, user.id, { productId: params.id, ...rest, percentBp: percent });
		});
		if (result.ok) return { for: 'invite', saved: true as const };
		// the service names the percentage `percentBp`; the form calls it `percent`
		const fields = result.data.fields && {
			...result.data.fields,
			...(result.data.fields.percentBp ? { percent: result.data.fields.percentBp } : {})
		};
		return fail(result.status, {
			...result.data,
			fields,
			for: 'invite',
			typed
		} satisfies ActionFailure & {
			for: string;
			typed: Record<string, string>;
		});
	},

	cancel: async ({ locals, url }) => {
		const id = idOf(url);
		return answer(await act(() => cancelInvite(ctx, requireUser(locals).id, id)), `cancel:${id}`);
	}
};
