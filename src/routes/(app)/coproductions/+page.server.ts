import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { listMyCoproductions } from '#lib/server/services/coproduction';
import type { PageServerLoad } from './$types';

// RF-50, RF-51. The list is the signed-in person's own invites and terms; no id in the URL.
export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return { terms: await listMyCoproductions(ctx, user.id) };
};
