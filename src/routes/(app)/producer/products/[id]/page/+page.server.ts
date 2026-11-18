import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { ctx } from '#lib/server/app';
import { pageType, type PageType } from '#lib/server/db/schema';
import { act, orNotFound, requireUser } from '#lib/server/http';
import { getProductEditor, updatePage } from '#lib/server/services/catalog';
import { readSections } from './sections';
import type { Actions, PageServerLoad } from './$types';

function typeOf(url: URL): PageType {
	const parsed = z.enum(pageType.enumValues).safeParse(url.searchParams.get('type'));
	return parsed.success ? parsed.data : 'sales';
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const type = typeOf(url);
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	return {
		type,
		product: { name: editor.product.name },
		sections: editor.pages[type].sections
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request, url }) => {
		const user = requireUser(locals);
		const type = typeOf(url);
		const sections = readSections(await request.formData());
		const saved = await act(() => updatePage(ctx, user.id, params.id, type, { sections }));
		// after a refusal the page shows what was typed, in the order it was sent
		if (!saved.ok) return fail(saved.status, { ...saved.data, type, typed: sections });
		return { saved: true, type };
	}
};
