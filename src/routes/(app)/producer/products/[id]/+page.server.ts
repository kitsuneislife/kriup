import { ctx } from '#lib/server/app';
import { orNotFound, requireUser } from '#lib/server/http';
import { getProductEditor } from '#lib/server/services/catalog';
import type { PageServerLoad } from './$types';

// Another producer's product, or a malformed id, answers 404 (RNF-05).
export const load: PageServerLoad = async ({ locals, params }) => {
	const editor = await orNotFound(getProductEditor(ctx, requireUser(locals).id, params.id));
	return { product: { name: editor.product.name, status: editor.product.status } };
};
