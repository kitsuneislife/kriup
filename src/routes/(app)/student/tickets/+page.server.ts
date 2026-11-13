import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { listMyTickets } from '#lib/server/services/support';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	tickets: await listMyTickets(ctx, requireUser(locals).id)
});
