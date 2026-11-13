import { releaseAt } from '#lib/domain/retention';
import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { listMyOrders } from '#lib/server/services/members';
import type { PageServerLoad } from './$types';

// RF-24. The guarantee end is only for an order still inside it and without a request.
export const load: PageServerLoad = async ({ locals }) => {
	const orders = await listMyOrders(ctx, requireUser(locals).id);
	const now = new Date();
	return {
		orders: orders.map((o) => {
			const until = o.status === 'paid' && o.paidAt ? releaseAt(o.paidAt, o.guaranteeDays) : null;
			return { ...o, guaranteeUntil: until && until > now && !o.refundId ? until : null };
		})
	};
};
