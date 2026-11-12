import { ctx } from '#lib/server/app';
import { act, orNotFound, requireUser } from '#lib/server/http';
import { offerForm } from '#lib/server/product-form';
import { addOffer, deleteOffer, getProductEditor, updateOffer } from '#lib/server/services/catalog';
import { answer, formText, idOf } from '../answer';
import type { Actions, PageServerLoad } from './$types';

// RF-15. The answers are for `offer:<id>`, `new-offer` or `delete:<id>` (see ../answer.ts).

export const load: PageServerLoad = async ({ locals, params }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	return {
		product: { name: editor.product.name },
		offers: editor.offers.map(({ id, name, priceCents, feeCents, guaranteeDays }) => ({
			id,
			name,
			priceCents,
			feeCents,
			guaranteeDays
		}))
	};
};

/** The fields as typed, given back on a refusal so nothing is lost. */
const typedOffer = (form: FormData) =>
	Object.fromEntries(['name', 'price', 'guaranteeDays'].map((key) => [key, formText(form, key)]));

export const actions: Actions = {
	addOffer: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const typed = typedOffer(await request.formData());
		const added = await act(() => addOffer(ctx, user.id, params.id, offerForm.parse(typed)));
		return answer(added, 'new-offer', added.ok ? undefined : typed);
	},

	updateOffer: async ({ locals, request, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		const typed = typedOffer(await request.formData());
		const updated = await act(() => updateOffer(ctx, user.id, id, offerForm.parse(typed)));
		return answer(updated, `offer:${id}`, updated.ok ? undefined : typed);
	},

	deleteOffer: async ({ locals, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		return answer(await act(() => deleteOffer(ctx, user.id, id)), `delete:${id}`);
	}
};
