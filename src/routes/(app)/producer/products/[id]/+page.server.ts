import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { ctx } from '#lib/server/app';
import { brandForm } from '#lib/server/brand-form';
import { act, fieldErrors, orNotFound, requireUser, type ActionFailure } from '#lib/server/http';
import {
	getProductEditor,
	updateProduct,
	updateProductSchema
} from '#lib/server/services/catalog';
import type { Actions, PageServerLoad } from './$types';

// Another producer's product, or a malformed id, answers 404 (RNF-05).
export const load: PageServerLoad = async ({ locals, params }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	const { name, type, status, brand, refundPolicy } = editor.product;
	return {
		product: { name, type, status, brand, refundPolicy },
		pendencies: editor.pendencies,
		lessonCount: editor.modules.reduce((sum, m) => sum + m.lessons.length, 0),
		offerCount: editor.offers.length
	};
};

/** The basic data as the form sends it, every field flat so each error lands on its input. */
const basicData = z.object({
	name: updateProductSchema.shape.name.unwrap(),
	refundPolicy: updateProductSchema.shape.refundPolicy.unwrap(),
	...brandForm.shape
});

type BasicData = Record<keyof z.input<typeof basicData>, string>;

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const typed = Object.fromEntries(
			Object.keys(basicData.shape).map((key) => {
				const value = form.get(key);
				return [key, typeof value === 'string' ? value : ''];
			})
		) as BasicData;
		const parsed = basicData.safeParse(typed);
		if (!parsed.success) {
			return fail(400, {
				code: 'invalid_input',
				fields: fieldErrors(parsed.error),
				typed
			} satisfies ActionFailure & { typed: BasicData });
		}
		const { name, refundPolicy, ...brand } = parsed.data;
		const updated = await act(() =>
			updateProduct(ctx, user.id, params.id, { name, refundPolicy, brand })
		);
		if (!updated.ok) return updated;
		return { saved: true };
	}
};
