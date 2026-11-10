import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { platformFee, splitSale } from '../../domain/split';
import { enrollment, ledgerEntry, order, passwordToken, user } from '../db/schema';
import { NotFoundError } from '../errors';
import { createProduct } from './catalog';
import { getPaymentStatus, startCheckout } from './checkout';
import { acceptInvite, inviteCoproducer } from './coproduction';
import { handlePaymentEvent } from './payments';
import { brand, buy, db, newUser, publishedProduct, resetDb, testCtx, VALID_CPF } from './testing';

beforeEach(resetDb);

const buyer = { method: 'pix' as const, name: 'Bia', email: 'Bia@Example.com', taxId: VALID_CPF };

describe('checkout (RF-21, RF-03)', () => {
	it('creates the buyer without a password and a pending order with its charge', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const { orderId, charge } = await startCheckout(ctx, null, { ...buyer, offerId });

		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		expect(o).toMatchObject({
			status: 'pending',
			grossCents: 10_000,
			feeCents: platformFee(10_000),
			guaranteeDays: 7,
			externalId: charge.externalId
		});
		const [account] = await db.select().from(user).where(eq(user.id, o!.studentId));
		expect(account).toMatchObject({ email: 'bia@example.com', passwordHash: null });
		expect(charge.pix?.payload).toBeTruthy();
		expect((await getPaymentStatus(ctx, orderId)).charge?.externalId).toBe(charge.externalId);
	});

	it('uses the signed-in buyer and rejects an invalid CPF', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const me = await newUser('me@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const { orderId } = await startCheckout(ctx, me, { ...buyer, offerId });
		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		expect(o!.studentId).toBe(me.id);
		await expect(
			startCheckout(ctx, null, { ...buyer, offerId, taxId: '111.111.111-11' })
		).rejects.toThrow();
	});

	it('does not sell a draft', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const id = await createProduct(ctx, producer.id, {
			templateSlug: 'online-course',
			name: 'Rascunho',
			audience: 'todos',
			priceCents: 5_000,
			brand
		});
		const [offer] = await db.query.offer.findMany({ where: (t, { eq }) => eq(t.productId, id) });
		await expect(startCheckout(ctx, null, { ...buyer, offerId: offer!.id })).rejects.toBeInstanceOf(
			NotFoundError
		);
	});
});

describe('payment confirmation (RF-22, RF-40, RN-15)', () => {
	it('pays the order, grants access, holds the sale and e-mails a set-password link', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const paidAt = new Date('2026-11-10T12:00:00Z');
		const orderId = await buy(ctx, offerId, 'bia@example.com', paidAt);

		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		expect(o).toMatchObject({ status: 'paid', paidAt });
		expect(await db.select().from(enrollment).where(eq(enrollment.orderId, orderId))).toMatchObject(
			[{ status: 'active' }]
		);
		const entries = await db.select().from(ledgerEntry).where(eq(ledgerEntry.orderId, orderId));
		expect(entries).toMatchObject([
			{
				userId: producer.id,
				type: 'sale',
				state: 'held',
				amountCents: splitSale(10_000, platformFee(10_000)).producerCents,
				releaseAt: new Date('2026-11-17T12:00:00Z')
			}
		]);
		expect(await db.select().from(passwordToken)).toHaveLength(1);
		expect(ctx.mail.sent).toHaveLength(1);
		expect(ctx.mail.sent[0]).toMatchObject({ to: 'bia@example.com' });
		expect(ctx.mail.sent[0]!.text).toContain('http://app.test/password/');
		expect(ctx.mail.sent[0]!.subject).toContain('Curso de pão');
	});

	it('ignores a repeated webhook and an expiry after payment', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const orderId = await buy(ctx, offerId, 'bia@example.com');
		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		const event = { externalId: o!.externalId!, amountCents: 10_000 };

		expect(await handlePaymentEvent(ctx, { ...event, type: 'paid' })).toBe('ignored');
		expect(await handlePaymentEvent(ctx, { ...event, type: 'expired' })).toBe('ignored');
		expect(await db.select().from(ledgerEntry)).toHaveLength(1);
		expect(await db.select().from(enrollment)).toHaveLength(1);
		expect(ctx.mail.sent).toHaveLength(1);
	});

	it('pays even when the payment arrives after the Pix expired', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const { orderId, charge } = await startCheckout(ctx, null, { ...buyer, offerId });
		const event = { externalId: charge.externalId, amountCents: 10_000 };
		expect(await handlePaymentEvent(ctx, { ...event, type: 'expired' })).toBe('applied');
		expect(await handlePaymentEvent(ctx, { ...event, type: 'paid' })).toBe('applied');
		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		expect(o!.status).toBe('paid');
	});

	it('stops loudly on an amount that is not the order price, and skips unknown charges', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const { charge } = await startCheckout(ctx, null, { ...buyer, offerId });
		await expect(
			handlePaymentEvent(ctx, { type: 'paid', externalId: charge.externalId, amountCents: 1 })
		).rejects.toThrow(/expected 10000/);
		expect(await db.select().from(ledgerEntry)).toHaveLength(0);
		expect(
			await handlePaymentEvent(ctx, { type: 'paid', externalId: 'other', amountCents: 1 })
		).toBe('unknown_charge');
	});

	it('splits with the coproducer accepted before the payment only (RN-12, US-04)', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { productId, offerId } = await publishedProduct(ctx, producer.id);
		const before = await buy(ctx, offerId, 'a@example.com', new Date('2026-11-01T00:00:00Z'));

		const invite = await inviteCoproducer(ctx, producer.id, {
			productId,
			email: 'co@example.com',
			name: 'Co',
			percentBp: 2_500,
			durationDays: null
		});
		const [co] = await db.select().from(user).where(eq(user.email, 'co@example.com'));
		await acceptInvite(ctx, co!.id, invite, new Date('2026-11-02T00:00:00Z'));
		const after = await buy(ctx, offerId, 'b@example.com', new Date('2026-11-03T00:00:00Z'));

		const parts = splitSale(10_000, platformFee(10_000), [2_500]);
		const of = (orderId: string) =>
			db.select().from(ledgerEntry).where(eq(ledgerEntry.orderId, orderId));
		expect((await of(before)).map((e) => e.userId)).toEqual([producer.id]);
		const split = await of(after);
		expect(split.find((e) => e.userId === co!.id)).toMatchObject({
			amountCents: parts.coproducerCents[0],
			coproductionId: invite
		});
		expect(split.reduce((sum, e) => sum + e.amountCents, 0)).toBe(parts.netCents);
	});
});
