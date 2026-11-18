import { ctx } from '#lib/server/app';
import { requireSupport } from '#lib/server/http';
import { getSupportQueue } from '#lib/server/services/support';
import type { PageServerLoad } from './$types';

// UC-06, RF-60. The escalated and contested refunds, closest deadline first, and the open
// tickets, oldest first. Payouts have their own screen. `now` goes with the data so the
// server and the browser read the deadlines at the same instant.
export const load: PageServerLoad = async ({ locals }) => {
	const { refunds, tickets, payouts } = await getSupportQueue(ctx, requireSupport(locals));
	return { refunds, tickets, payouts, now: new Date() };
};
