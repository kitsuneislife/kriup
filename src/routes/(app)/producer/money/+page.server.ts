import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { getMoneyPanel } from '#lib/server/services/money';
import type { PageServerLoad } from './$types';

// RF-41, RF-42, RF-45. The panel is always the signed-in person's own money (RNF-05).
export const load: PageServerLoad = async ({ locals }) => ({
	panel: await getMoneyPanel(ctx, requireUser(locals).id)
});
