import { ctx } from '#lib/server/app';
import { requireSupport } from '#lib/server/http';
import { listAuditTrail } from '#lib/server/services/support';
import type { PageServerLoad } from './$types';

// RF-62: the newest 100 support actions, each with who, what, when and on whom.
export const load: PageServerLoad = async ({ locals }) => ({
	entries: await listAuditTrail(ctx, requireSupport(locals))
});
