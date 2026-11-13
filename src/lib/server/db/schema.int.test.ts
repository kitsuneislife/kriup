import 'dotenv/config';
import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { isPgEnum } from 'drizzle-orm/pg-core';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { COPRODUCTION_MAX_BP, PAYOUT_FEE_CENTS } from '../../domain/params';
import { balance } from '../../domain/retention';
import { platformFee, splitRefund, splitSale } from '../../domain/split';
import { createDb } from './client';
import * as s from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = createDb(url);

const CHECK = '23514';
const FOREIGN_KEY = '23503';
const UNIQUE = '23505';
const INVALID_ENUM = '22P02';

/** Drizzle wraps driver errors; the SQLSTATE is on the error or its cause. */
async function rejectsWith(query: PromiseLike<unknown>, code: string) {
	const error: unknown = await Promise.resolve(query).then(
		() => null,
		(e: unknown) => e
	);
	expect(error, `expected SQLSTATE ${code}`).not.toBeNull();
	const e = error as { code?: string; cause?: { code?: string } };
	expect(e.code ?? e.cause?.code).toBe(code);
}

async function truncateAll() {
	const rows = await db.execute<{ tablename: string }>(
		sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
	);
	const tables = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
	// TRUNCATE skips row triggers, so append-only tables can be emptied between tests.
	if (tables) await db.execute(sql.raw(`TRUNCATE ${tables} CASCADE`));
}

const brand = { logoUrl: null, color: '#3355ff', font: 'Inter' } satisfies s.Brand;
const emptyPage = { sections: [] } satisfies s.PageContent;
const PAID_AT = new Date('2026-11-01T12:00:00Z');

async function newUser(email: string, platformRole: 'user' | 'support' = 'user') {
	const [row] = await db
		.insert(s.user)
		.values({ email, name: email.split('@')[0]!, passwordHash: 'x', platformRole })
		.returning();
	return row!;
}

/** A producer with a published product, an offer and a paid order by a student. */
async function seedSale(grossCents = 10_000) {
	const producer = await newUser('producer@example.com');
	const student = await newUser('student@example.com');
	const [tpl] = await db
		.insert(s.template)
		.values({
			slug: 'course-basic',
			name: 'Curso básico',
			productType: 'course',
			structure: {
				pages: { sales: emptyPage, checkout: emptyPage, access_email: emptyPage },
				refundPolicy: 'Reembolso em 7 dias.',
				modules: [{ title: 'Boas-vindas', lessons: [{ title: 'Comece aqui' }] }]
			}
		})
		.returning();
	const [prod] = await db
		.insert(s.product)
		.values({
			producerId: producer.id,
			templateId: tpl!.id,
			name: 'Curso de pão',
			type: 'course',
			status: 'published',
			publishedAt: PAID_AT,
			brand,
			refundPolicy: 'Reembolso em 7 dias.'
		})
		.returning();
	const [off] = await db
		.insert(s.offer)
		.values({ productId: prod!.id, name: 'À vista', priceCents: grossCents })
		.returning();
	const [ord] = await db
		.insert(s.order)
		.values({
			offerId: off!.id,
			productId: prod!.id,
			studentId: student.id,
			paymentMethod: 'pix',
			grossCents,
			feeCents: platformFee(grossCents),
			guaranteeDays: off!.guaranteeDays,
			status: 'paid',
			externalId: 'charge-1',
			paidAt: PAID_AT
		})
		.returning();
	return { producer, student, template: tpl!, product: prod!, offer: off!, order: ord! };
}

async function saleEntry(userId: string, orderId: string, amountCents: number) {
	const [row] = await db
		.insert(s.ledgerEntry)
		.values({
			userId,
			orderId,
			type: 'sale',
			amountCents,
			state: 'held',
			reason: 'Venda em período de garantia',
			releaseAt: new Date(PAID_AT.getTime() + 7 * 86_400_000)
		})
		.returning();
	return row!;
}

async function balanceOf(userId: string) {
	return balance(
		await db
			.select({ amountCents: s.ledgerEntry.amountCents, state: s.ledgerEntry.state })
			.from(s.ledgerEntry)
			.where(eq(s.ledgerEntry.userId, userId))
	);
}

beforeEach(truncateAll);
afterAll(truncateAll);

describe('enums', () => {
	it('match the values in the schema, so no migration is missing', async () => {
		const rows = await db.execute<{ name: string; values: string[] }>(sql`
			SELECT t.typname AS name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
			FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid GROUP BY t.typname`);
		const inDb = Object.fromEntries(rows.map((r) => [r.name, r.values]));
		const enums = (Object.values(s) as unknown[]).filter(isPgEnum);
		expect(enums.length).toBeGreaterThan(10);
		for (const e of enums) expect(inDb[e.enumName], e.enumName).toEqual(e.enumValues);
	});
});

describe('user', () => {
	it('allows a student without a password yet (RF-03)', async () => {
		await db.insert(s.user).values({ email: 'new@example.com', name: 'Nova' });
	});

	it('refuses an unknown platform role and a blank name', async () => {
		await rejectsWith(
			db.execute(
				sql`INSERT INTO "user" (email, name, platform_role) VALUES ('x@example.com', 'X', 'admin')`
			),
			INVALID_ENUM
		);
		await rejectsWith(db.insert(s.user).values({ email: 'y@example.com', name: '  ' }), CHECK);
	});
});

describe('product and offer', () => {
	it('requires publishedAt exactly when published', async () => {
		const { product } = await seedSale();
		await rejectsWith(
			db.update(s.product).set({ publishedAt: null }).where(eq(s.product.id, product.id)),
			CHECK
		);
	});

	it('refuses an offer below the minimum price or the legal guarantee', async () => {
		const { product } = await seedSale();
		await rejectsWith(
			db.insert(s.offer).values({ productId: product.id, name: 'Barata', priceCents: 499 }),
			CHECK
		);
		await rejectsWith(
			db
				.insert(s.offer)
				.values({ productId: product.id, name: 'Curta', priceCents: 1000, guaranteeDays: 6 }),
			CHECK
		);
	});

	it('keeps one page of each type per product', async () => {
		const { product } = await seedSale();
		await db.insert(s.page).values({ productId: product.id, type: 'sales', content: emptyPage });
		await rejectsWith(
			db.insert(s.page).values({ productId: product.id, type: 'sales', content: emptyPage }),
			UNIQUE
		);
	});

	it('deletes a product with its content, but not once it has sales', async () => {
		const { product } = await seedSale();
		const [mod] = await db
			.insert(s.module)
			.values({ productId: product.id, title: 'Módulo 1', position: 0 })
			.returning();
		await db.insert(s.lesson).values({ moduleId: mod!.id, title: 'Aula 1', position: 0 });
		await rejectsWith(db.delete(s.product).where(eq(s.product.id, product.id)), FOREIGN_KEY);

		await db.delete(s.order);
		await db.delete(s.product).where(eq(s.product.id, product.id));
		expect(await db.select().from(s.lesson)).toHaveLength(0);
	});
});

describe('order', () => {
	it('is paid once per external charge (RN-15)', async () => {
		const { order } = await seedSale();
		const copy = { ...order, id: undefined };
		await rejectsWith(db.insert(s.order).values(copy), UNIQUE);
	});

	it('must name the product of its offer', async () => {
		const { order, producer, template } = await seedSale();
		const [other] = await db
			.insert(s.product)
			.values({
				producerId: producer.id,
				templateId: template.id,
				name: 'Outro',
				type: 'course',
				brand
			})
			.returning();
		await rejectsWith(
			db.update(s.order).set({ productId: other!.id }).where(eq(s.order.id, order.id)),
			FOREIGN_KEY
		);
	});

	it('has paidAt exactly when paid or refunded, and a fee within the gross', async () => {
		const { order } = await seedSale();
		await rejectsWith(
			db.update(s.order).set({ status: 'pending' }).where(eq(s.order.id, order.id)),
			CHECK
		);
		await rejectsWith(
			db
				.update(s.order)
				.set({ feeCents: order.grossCents + 1 })
				.where(eq(s.order.id, order.id)),
			CHECK
		);
	});

	it('grants one enrollment, and progress is per student and lesson', async () => {
		const { order, student, product } = await seedSale();
		await db.insert(s.enrollment).values({ orderId: order.id });
		await rejectsWith(db.insert(s.enrollment).values({ orderId: order.id }), UNIQUE);
		await rejectsWith(
			db.update(s.enrollment).set({ status: 'revoked' }).where(eq(s.enrollment.orderId, order.id)),
			CHECK
		);

		const [mod] = await db
			.insert(s.module)
			.values({ productId: product.id, title: 'M', position: 0 })
			.returning();
		const [les] = await db
			.insert(s.lesson)
			.values({ moduleId: mod!.id, title: 'A', position: 0 })
			.returning();
		await db.insert(s.lessonProgress).values({ userId: student.id, lessonId: les!.id });
		await rejectsWith(
			db.insert(s.lessonProgress).values({ userId: student.id, lessonId: les!.id }),
			UNIQUE
		);
	});
});

describe('ledger', () => {
	it('records a sale, refund and payout whose balance matches the domain', async () => {
		const { order, producer } = await seedSale(10_000);
		const sale = splitSale(order.grossCents, order.feeCents);
		const entry = await saleEntry(producer.id, order.id, sale.producerCents);
		expect(await balanceOf(producer.id)).toEqual({
			heldCents: sale.producerCents,
			releasedCents: 0,
			paidOutCents: 0
		});

		// Release job, then a payout of everything released.
		await db
			.update(s.ledgerEntry)
			.set({ state: 'released' })
			.where(and(eq(s.ledgerEntry.state, 'held'), sql`${s.ledgerEntry.releaseAt} <= now()`));
		const amount = sale.producerCents;
		const [po] = await db
			.insert(s.payout)
			.values({ userId: producer.id, amountCents: amount, feeCents: PAYOUT_FEE_CENTS })
			.returning();
		const sent = amount - PAYOUT_FEE_CENTS;
		await db.insert(s.ledgerEntry).values([
			{
				userId: producer.id,
				payoutId: po!.id,
				type: 'payout',
				amountCents: -sent,
				state: 'released',
				reason: 'Saque'
			},
			{
				userId: producer.id,
				payoutId: po!.id,
				type: 'payout_fee',
				amountCents: -PAYOUT_FEE_CENTS,
				state: 'released',
				reason: 'Taxa de saque'
			}
		]);
		await db
			.update(s.payout)
			.set({ status: 'completed', decidedAt: new Date() })
			.where(eq(s.payout.id, po!.id));
		await db.insert(s.ledgerEntry).values({
			userId: producer.id,
			payoutId: po!.id,
			type: 'payout',
			amountCents: sent,
			state: 'paid_out',
			reason: 'Saque concluído'
		});
		expect(await balanceOf(producer.id)).toEqual({
			heldCents: 0,
			releasedCents: 0,
			paidOutCents: sent
		});

		// Refund after the payout (RN-06, RN-07): the sale is reversed and the fixed fee
		// the platform keeps is charged on top, leaving released negative.
		const back = splitRefund(order.grossCents, order.feeCents);
		await db.update(s.ledgerEntry).set({ state: 'reversed' }).where(eq(s.ledgerEntry.id, entry.id));
		await db.insert(s.ledgerEntry).values({
			userId: producer.id,
			orderId: order.id,
			referenceId: entry.id,
			type: 'reversal',
			amountCents: -(back.producerCents - sale.producerCents),
			state: 'released',
			reason: 'Taxa fixa não devolvida no reembolso'
		});
		expect(await balanceOf(producer.id)).toEqual({
			heldCents: 0,
			releasedCents: -back.producerCents,
			paidOutCents: sent
		});
	});

	it('needs a reason the producer can read to decline a payout', async () => {
		const { producer } = await seedSale();
		const declined = {
			userId: producer.id,
			amountCents: 5_000,
			feeCents: PAYOUT_FEE_CENTS,
			status: 'declined' as const,
			decidedAt: new Date()
		};
		await rejectsWith(db.insert(s.payout).values(declined), CHECK);
		await rejectsWith(db.insert(s.payout).values({ ...declined, declineReason: ' ' }), CHECK);
		await db.insert(s.payout).values({ ...declined, declineReason: 'Conta inválida' });
	});

	it('changes only the state, along the allowed transitions (RN-14)', async () => {
		const { order, producer } = await seedSale();
		const entry = await saleEntry(producer.id, order.id, 5_000);
		const byId = eq(s.ledgerEntry.id, entry.id);
		await rejectsWith(db.update(s.ledgerEntry).set({ amountCents: 1 }).where(byId), CHECK);
		await rejectsWith(db.update(s.ledgerEntry).set({ reason: 'outro' }).where(byId), CHECK);
		await rejectsWith(db.update(s.ledgerEntry).set({ state: 'paid_out' }).where(byId), CHECK);
		await rejectsWith(db.delete(s.ledgerEntry).where(byId), CHECK);

		await db.update(s.ledgerEntry).set({ state: 'reversed' }).where(byId);
		await rejectsWith(db.update(s.ledgerEntry).set({ state: 'released' }).where(byId), CHECK);
	});

	it('starts a sale held, once per party and order', async () => {
		const { order, producer } = await seedSale();
		await rejectsWith(
			db.insert(s.ledgerEntry).values({
				userId: producer.id,
				orderId: order.id,
				type: 'sale',
				amountCents: 100,
				state: 'released',
				reason: 'Venda',
				releaseAt: PAID_AT
			}),
			CHECK
		);
		await saleEntry(producer.id, order.id, 100);
		await rejectsWith(saleEntry(producer.id, order.id, 100), UNIQUE);
	});

	it('enforces sign, state and links by type', async () => {
		const { order, producer } = await seedSale();
		const base = { userId: producer.id, reason: 'x', state: 'released' as const };
		// a negative sale
		await rejectsWith(
			db.insert(s.ledgerEntry).values({
				...base,
				state: 'held',
				type: 'sale',
				orderId: order.id,
				amountCents: -1,
				releaseAt: PAID_AT
			}),
			CHECK
		);
		// a reversal with no original
		await rejectsWith(
			db
				.insert(s.ledgerEntry)
				.values({ ...base, type: 'reversal', orderId: order.id, amountCents: -1 }),
			CHECK
		);
		// a payout with no payout
		await rejectsWith(
			db.insert(s.ledgerEntry).values({ ...base, type: 'payout', amountCents: -1 }),
			CHECK
		);
		// a blank reason
		await rejectsWith(
			db.insert(s.ledgerEntry).values({
				...base,
				reason: ' ',
				type: 'sale',
				state: 'held',
				orderId: order.id,
				amountCents: 1,
				releaseAt: PAID_AT
			}),
			CHECK
		);
	});
});

describe('coproduction', () => {
	async function invite(productId: string, coproducerId: string, percentBp: number) {
		const [row] = await db
			.insert(s.coproduction)
			.values({ productId, coproducerId, percentBp, contractVersion: 1, contractText: 'Contrato' })
			.returning();
		return row!;
	}
	const activate = (id: string) =>
		db
			.update(s.coproduction)
			.set({ status: 'active', acceptedAt: new Date() })
			.where(eq(s.coproduction.id, id));

	it(`keeps the shares in force within ${COPRODUCTION_MAX_BP} bp (RN-12)`, async () => {
		const { product } = await seedSale();
		const a = await newUser('a@example.com');
		const b = await newUser('b@example.com');
		await activate((await invite(product.id, a.id, COPRODUCTION_MAX_BP - 1000)).id);
		const second = await invite(product.id, b.id, 1001);
		await rejectsWith(activate(second.id), CHECK);
		await db
			.update(s.coproduction)
			.set({ percentBp: 1000 })
			.where(eq(s.coproduction.id, second.id));
		await activate(second.id);
	});

	it('ignores terms that already ended', async () => {
		const { product } = await seedSale();
		const a = await newUser('a@example.com');
		const b = await newUser('b@example.com');
		const old = await invite(product.id, a.id, COPRODUCTION_MAX_BP);
		await db
			.update(s.coproduction)
			.set({ status: 'active', acceptedAt: new Date('2026-01-01'), endsAt: new Date('2026-02-01') })
			.where(eq(s.coproduction.id, old.id));
		await activate((await invite(product.id, b.id, COPRODUCTION_MAX_BP)).id);
	});

	it('refuses the producer as coproducer and a second pending invite', async () => {
		const { product, producer } = await seedSale();
		await rejectsWith(invite(product.id, producer.id, 1000), CHECK);
		const a = await newUser('a@example.com');
		await invite(product.id, a.id, 1000);
		await rejectsWith(invite(product.id, a.id, 2000), UNIQUE);
	});

	it('records an acceptance by the coproducer only, and never changes it (RF-51)', async () => {
		const { product, student } = await seedSale();
		const a = await newUser('a@example.com');
		const term = await invite(product.id, a.id, 1000);
		const textHash = createHash('sha256').update(term.contractText).digest('hex');
		const values = { coproductionId: term.id, contractVersion: 1, textHash };
		await rejectsWith(
			db.insert(s.acceptance).values({ ...values, userId: student.id }),
			FOREIGN_KEY
		);
		await rejectsWith(
			db.insert(s.acceptance).values({ ...values, userId: a.id, textHash: 'abc' }),
			CHECK
		);
		await db.insert(s.acceptance).values({ ...values, userId: a.id });
		await rejectsWith(db.update(s.acceptance).set({ contractVersion: 2 }), CHECK);
		await rejectsWith(db.delete(s.acceptance), CHECK);
	});

	it("links a coproducer's entry to their own term (RF-53)", async () => {
		const { product, order, producer } = await seedSale();
		const a = await newUser('a@example.com');
		const term = await invite(product.id, a.id, 1000);
		await rejectsWith(
			db.insert(s.ledgerEntry).values({
				userId: producer.id,
				orderId: order.id,
				coproductionId: term.id,
				type: 'sale',
				amountCents: 100,
				state: 'held',
				reason: 'Venda',
				releaseAt: PAID_AT
			}),
			FOREIGN_KEY
		);
	});
});

describe('refund', () => {
	const open = (orderId: string) => ({
		orderId,
		reason: 'Não era o que eu esperava',
		status: 'with_producer' as const,
		owner: 'producer' as const,
		dueAt: new Date()
	});

	it('has one request per order with an owner that matches the status (RN-10)', async () => {
		const { order } = await seedSale();
		await rejectsWith(db.insert(s.refund).values({ ...open(order.id), owner: 'platform' }), CHECK);
		await db.insert(s.refund).values(open(order.id));
		await rejectsWith(db.insert(s.refund).values(open(order.id)), UNIQUE);
	});

	it('needs a reason the student can read to decline (RN-08)', async () => {
		const { order } = await seedSale();
		await rejectsWith(
			db.insert(s.refund).values({ ...open(order.id), status: 'declined', declineReason: ' ' }),
			CHECK
		);
	});

	it('keeps each message on exactly one thread', async () => {
		const { order, student } = await seedSale();
		const [r] = await db.insert(s.refund).values(open(order.id)).returning();
		const [t] = await db
			.insert(s.ticket)
			.values({ orderId: order.id, studentId: student.id, subject: 'Acesso' })
			.returning();
		await rejectsWith(
			db
				.insert(s.message)
				.values({ refundId: r!.id, ticketId: t!.id, authorId: student.id, body: 'Oi' }),
			CHECK
		);
		await rejectsWith(db.insert(s.message).values({ authorId: student.id, body: 'Oi' }), CHECK);
		await db.insert(s.message).values({ refundId: r!.id, authorId: student.id, body: 'Oi' });
	});

	it("refuses a ticket on someone else's order", async () => {
		const { order, producer } = await seedSale();
		await rejectsWith(
			db.insert(s.ticket).values({ orderId: order.id, studentId: producer.id, subject: 'Oi' }),
			FOREIGN_KEY
		);
	});
});

describe('administration', () => {
	it('blocks only with a reason and a next step (RN-11)', async () => {
		const { producer } = await seedSale();
		const support = await newUser('support@example.com', 'support');
		const values = {
			userId: producer.id,
			target: 'balance' as const,
			reason: 'Documento pendente',
			nextStep: 'Envie um documento com foto',
			createdById: support.id
		};
		await rejectsWith(db.insert(s.block).values({ ...values, reason: '' }), CHECK);
		await rejectsWith(db.insert(s.block).values({ ...values, nextStep: ' ' }), CHECK);
		await db.insert(s.block).values(values);
	});

	it("names a product only on a product block, and only the user's own", async () => {
		const { producer, product, student } = await seedSale();
		const support = await newUser('support@example.com', 'support');
		const values = { reason: 'r', nextStep: 'n', createdById: support.id };
		await rejectsWith(
			db.insert(s.block).values({ ...values, userId: producer.id, target: 'product' }),
			CHECK
		);
		await rejectsWith(
			db
				.insert(s.block)
				.values({ ...values, userId: student.id, target: 'product', productId: product.id }),
			FOREIGN_KEY
		);
		await db
			.insert(s.block)
			.values({ ...values, userId: producer.id, target: 'product', productId: product.id });
	});

	it('never changes the audit log (RF-62)', async () => {
		const support = await newUser('support@example.com', 'support');
		await db.insert(s.auditLog).values({ actorId: support.id, action: 'block.create' });
		await rejectsWith(db.update(s.auditLog).set({ action: 'x' }), CHECK);
		await rejectsWith(db.delete(s.auditLog), CHECK);
	});
});
