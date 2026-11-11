import { fail } from '@sveltejs/kit';
import { ctx } from '#lib/server/app';
import { act, orNotFound, requireUser } from '#lib/server/http';
import { getProductEditor, updatePage } from '#lib/server/services/catalog';
import { readSections } from './sections';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	return { product: { name: editor.product.name }, sections: editor.pages.sales.sections };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const sections = readSections(await request.formData());
		const saved = await act(() => updatePage(ctx, user.id, params.id, 'sales', { sections }));
		// after a refusal the page shows what was typed, in the order it was sent
		if (!saved.ok) return fail(saved.status, { ...saved.data, typed: sections });
		return { saved: true };
	}
};
