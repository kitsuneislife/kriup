import { z } from 'zod';
import { ctx } from '#lib/server/app';
import { act, formText, orNotFound, requireUser } from '#lib/server/http';
import { offerForm } from '#lib/server/product-form';
import {
	addOffer,
	deleteOffer,
	getProductEditor,
	offerSchema,
	updateOffer
} from '#lib/server/services/catalog';
import { answer, idOf } from '../answer';
import type { Actions, PageServerLoad } from './$types';

// RF-15. The answers are for `offer:<id>`, `new-offer` or `delete:<id>` (see ../answer.ts).

export const load: PageServerLoad = async ({ locals, params }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	return {
		product: { name: editor.product.name },
		offers: editor.offers.map(({ id, name, priceCents, feeCents, guaranteeDays, recurrence }) => ({
			id,
			name,
			priceCents,
			feeCents,
			guaranteeDays,
			recurrence
		}))
	};
};

/** The fields as typed, given back on a refusal so nothing is lost. */
const typedOffer = (form: FormData) =>
	Object.fromEntries(
		['name', 'price', 'guaranteeDays', 'recurrence'].map((key) => [key, formText(form, key)])
	);

const recurrenceField = z.object({
	recurrence: z
		.string()
		.trim()
		.transform((value) => (value === '' ? undefined : value))
		.pipe(offerSchema.shape.recurrence)
});

function readOffer(typed: Record<string, string>) {
	const base = offerForm.safeParse(typed);
	const rec = recurrenceField.safeParse(typed);
	if (!base.success || !rec.success) {
		throw new z.ZodError([...(base.error?.issues ?? []), ...(rec.error?.issues ?? [])]);
	}
	return { ...base.data, recurrence: rec.data.recurrence };
}

export const actions: Actions = {
	addOffer: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const typed = typedOffer(await request.formData());
		const added = await act(() => addOffer(ctx, user.id, params.id, readOffer(typed)));
		return answer(added, 'new-offer', added.ok ? undefined : typed);
	},

	updateOffer: async ({ locals, request, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		const typed = typedOffer(await request.formData());
		const updated = await act(() => updateOffer(ctx, user.id, id, readOffer(typed)));
		return answer(updated, `offer:${id}`, updated.ok ? undefined : typed);
	},

	deleteOffer: async ({ locals, url }) => {
		const user = requireUser(locals);
		const id = idOf(url);
		return answer(await act(() => deleteOffer(ctx, user.id, id)), `delete:${id}`);
	}
};
