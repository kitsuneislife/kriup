import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { listMyProducts } from '#lib/server/services/members';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	products: await listMyProducts(ctx, requireUser(locals).id)
});
