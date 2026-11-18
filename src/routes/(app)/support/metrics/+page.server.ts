import { ctx } from '#lib/server/app';
import { requireSupport } from '#lib/server/http';
import { getPlatformMetrics } from '#lib/server/services/support';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	metrics: await getPlatformMetrics(ctx, requireSupport(locals))
});
