import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { listProducerRefunds } from '#lib/server/services/refunds';
import type { PageServerLoad } from './$types';

// UC-05, RF-33. Only the requests on the signed-in producer's own products; `now` goes
// with the data so the server and the browser read the deadlines at the same instant.
export const load: PageServerLoad = async ({ locals }) => ({
	refunds: await listProducerRefunds(ctx, requireUser(locals).id),
	now: new Date()
});
