// The daily job (arquitetura.md): one call does every time-based step. Each step is
// idempotent, so running it twice or late is safe.

import { and, eq, isNull, lt } from 'drizzle-orm';
import { addDays } from '../../domain/money';
import type { Ctx } from '../context';
import { order } from '../db/schema';
import { releaseHeld } from '../services/money';
import { escalateOverdueRefunds, retryApprovedRefunds } from '../services/refunds';

export async function runDailyJobs(ctx: Ctx, now = new Date()) {
	return {
		released: await releaseHeld(ctx, now),
		escalated: await escalateOverdueRefunds(ctx, now),
		refundsRetried: await retryApprovedRefunds(ctx, now),
		abandonedOrders: await expireAbandonedOrders(ctx, now)
	};
}

/**
 * An order whose charge was never created (the provider failed at checkout) would wait
 * forever; after a day it expires. Orders with a charge wait for the provider's event.
 */
async function expireAbandonedOrders(ctx: Ctx, now: Date): Promise<number> {
	const rows = await ctx.db
		.update(order)
		.set({ status: 'expired' })
		.where(
			and(
				eq(order.status, 'pending'),
				isNull(order.externalId),
				lt(order.createdAt, addDays(now, -1))
			)
		)
		.returning({ id: order.id });
	return rows.length;
}
