import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { ctx } from '#lib/server/app';
import {
	act,
	fieldErrors,
	formText,
	orNotFound,
	requireUser,
	type ActionFailure
} from '#lib/server/http';
import { brandForm } from '#lib/server/product-form';
import {
	getProductEditor,
	publishProduct,
	updateProduct,
	updateProductSchema
} from '#lib/server/services/catalog';
import { answer } from './answer';
import type { Actions, PageServerLoad } from './$types';

// Another producer's product, or a malformed id, answers 404 (RNF-05).
export const load: PageServerLoad = async ({ locals, params }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	const { name, type, status, brand, refundPolicy } = editor.product;
	const hero = editor.pages.sales.sections.find((s) => s.kind === 'hero')?.fields;
	return {
		product: { name, type, status, brand, refundPolicy },
		publicUrl: `${ctx.appUrl}/p/${params.id}`,
		hero: {
			subtitle: hero?.subtitle ?? '',
			cta: hero?.cta || 'Quero comprar'
		},
		pendencies: editor.pendencies,
		sectionCount: editor.pages.sales.sections.length,
		moduleCount: editor.modules.length,
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
			Object.keys(basicData.shape).map((key) => [key, formText(form, key)])
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
	},

	// RN-01: the service checks the pendencies and the blocks again, whatever the screen showed
	publish: async ({ locals, params }) => {
		const user = requireUser(locals);
		return answer(await act(() => publishProduct(ctx, user.id, params.id)), 'publish');
	}
};
