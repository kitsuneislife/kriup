import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { listProducerProducts } from '#lib/server/services/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	products: await listProducerProducts(ctx, requireUser(locals).id)
});
