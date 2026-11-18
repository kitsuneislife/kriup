// Shared setup for the service integration tests (*.int.test.ts) and the e2e fixtures
// (e2e/fixtures.ts). Never imported by app code. No Vitest import: Playwright loads it too.

import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { and, eq, sql } from 'drizzle-orm';
import { DomainError, type DomainErrorCode } from '../../domain/states';
import type { SessionUser } from '../auth/session';
import type { Ctx } from '../context';
import { createDb } from '../db/client';
import { ledgerEntry, user } from '../db/schema';
import { memoryMailer } from '../email/mailer';
import type { PaymentGateway } from '../payment/gateway';
import { simulatedGateway } from '../payment/simulated';
import { createProduct, publishProduct } from './catalog';
import { startCheckout } from './checkout';
import { handlePaymentEvent } from './payments';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
export const db = createDb(url);

const seedSql = [
	'../../../../drizzle/0003_seed_templates.sql',
	'../../../../drizzle/0005_seed_templates_extra.sql'
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'));

/** Empties every table, then restores the template seed. */
export async function resetDb() {
	const rows = await db.execute<{ tablename: string }>(
		sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
	);
	const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
	// TRUNCATE skips row triggers, so append-only tables can be emptied between tests.
	if (tables) await db.execute(sql.raw(`TRUNCATE ${tables} CASCADE`));
	for (const seed of seedSql) await db.execute(sql.raw(seed));
}

export type TestCtx = Ctx & {
	mail: ReturnType<typeof memoryMailer>;
	refunds: string[];
	failRefunds: boolean;
};

/** A context with a fake provider that records refunds and can be told to fail them. */
export function testCtx(): TestCtx {
	const base = simulatedGateway({ appUrl: 'http://app.test', webhookToken: 'secret' });
	const ctx: TestCtx = {
		db,
		appUrl: 'http://app.test',
		mail: memoryMailer(),
		refunds: [],
		failRefunds: false,
		payments: {
			...base,
			refund: async (externalId) => {
				if (ctx.failRefunds) throw new Error('provider down');
				ctx.refunds.push(externalId);
			}
		} satisfies PaymentGateway
	};
	return ctx;
}

export async function newUser(
	email: string,
	platformRole: 'user' | 'support' = 'user',
	name = email.split('@')[0]!
): Promise<SessionUser> {
	const [row] = await db
		.insert(user)
		.values({ email, name, passwordHash: 'x', platformRole })
		.returning({
			id: user.id,
			email: user.email,
			name: user.name,
			platformRole: user.platformRole
		});
	return row!;
}

export const brand = { logoUrl: null, color: '#3355ff', font: 'Inter' };

/** A published course by `producer` with one offer at `priceCents`. */
export async function publishedProduct(
	ctx: Ctx,
	producerId: string,
	priceCents = 10_000,
	name = 'Curso de pão'
) {
	const productId = await createProduct(ctx, producerId, {
		templateSlug: 'online-course',
		name,
		audience: 'iniciantes',
		priceCents,
		brand
	});
	await publishProduct(ctx, producerId, productId);
	const [offer] = await db.query.offer.findMany({
		where: (o, { eq }) => eq(o.productId, productId)
	});
	return { productId, offerId: offer!.id };
}

export const VALID_CPF = '529.982.247-25';

/** Checkout and a confirmed payment at `paidAt`; returns the order id. */
export async function buy(ctx: Ctx, offerId: string, email: string, paidAt = new Date()) {
	const { orderId, charge } = await startCheckout(
		ctx,
		null,
		{ offerId, method: 'pix', name: email.split('@')[0]!, email, taxId: VALID_CPF },
		paidAt
	);
	const [o] = await db.query.order.findMany({ where: (t, { eq }) => eq(t.id, orderId) });
	await handlePaymentEvent(
		ctx,
		{ type: 'paid', externalId: charge.externalId, amountCents: o!.grossCents },
		paidAt
	);
	return orderId;
}

/**
 * Releases the held sales of one person, as the daily job would. The job itself
 * (`releaseHeld`) moves every sale due, so e2e specs running in parallel would release
 * each other's money; they use this instead.
 */
export async function releaseSalesOf(userId: string) {
	await db
		.update(ledgerEntry)
		.set({ state: 'released' })
		.where(
			and(
				eq(ledgerEntry.userId, userId),
				eq(ledgerEntry.state, 'held'),
				eq(ledgerEntry.type, 'sale')
			)
		);
}

export async function rejectsCode(work: Promise<unknown>, code: DomainErrorCode) {
	const err = await work.then(
		() => null,
		(e: unknown) => e
	);
	assert.ok(err instanceof DomainError, `expected DomainError(${code}), got ${String(err)}`);
	assert.equal(err.code, code);
}

export const days = (from: Date, n: number) => new Date(from.getTime() + n * 86_400_000);
