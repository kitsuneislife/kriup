// Checkout (RF-21): an order snapshots the offer, then the provider charges it. The
// payment is confirmed later by a webhook (payments.ts).

import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { addDays } from '../../domain/money';
import { platformFee } from '../../domain/split';
import { DomainError } from '../../domain/states';
import { normalizeTaxId } from '../../domain/tax-id';
import { emailSchema, nameSchema } from '../auth/credentials';
import type { SessionUser } from '../auth/session';
import type { Ctx } from '../context';
import { offer, order, product } from '../db/schema';
import { assertFound } from '../errors';
import type { Charge } from '../payment/gateway';
import { findOrCreateAccount } from '../users';
import { onSale } from './catalog';

/** Days a Pix charge stays payable; after that the provider reports it expired. */
export const PIX_DUE_DAYS = 1;

export const checkoutSchema = z.object({
	offerId: z.uuid(),
	method: z.enum(['pix', 'card']),
	name: nameSchema,
	email: emailSchema,
	/** CPF or CNPJ: the provider requires it; it is sent there and not stored here. */
	taxId: z.string().transform((value, issue) => {
		const digits = normalizeTaxId(value);
		if (digits === null) {
			issue.addIssue({ code: 'custom', message: 'invalid CPF or CNPJ' });
			return z.NEVER;
		}
		return digits;
	})
});

/**
 * RF-21 and RF-03: creates the order, and the buyer's account when they are not signed
 * in (the e-mail of a signed-in buyer wins over the form). Then asks the provider for the
 * charge and returns it for the payment screen.
 */
export async function startCheckout(
	ctx: Ctx,
	buyer: SessionUser | null,
	input: z.input<typeof checkoutSchema>,
	now = new Date()
): Promise<{ orderId: string; charge: Charge }> {
	const data = checkoutSchema.parse(input);

	const created = await ctx.db.transaction(async (tx) => {
		const [off] = await tx.select().from(offer).where(eq(offer.id, data.offerId));
		const found = assertFound(off, 'offer');
		const prod = assertFound(await onSale(tx, found.productId, now), 'product');
		if (found.recurrence !== 'one_time') {
			throw new DomainError('recurrence_not_supported', 'subscriptions wait for decision D5');
		}
		const account = buyer ?? (await findOrCreateAccount(tx, data.email, data.name));
		const [row] = await tx
			.insert(order)
			.values({
				offerId: found.id,
				productId: found.productId,
				studentId: account.id,
				paymentMethod: data.method,
				grossCents: found.priceCents,
				feeCents: platformFee(found.priceCents),
				guaranteeDays: found.guaranteeDays
			})
			.returning({ id: order.id, grossCents: order.grossCents });
		return { order: row!, productName: prod.name, account };
	});

	const charge = await ctx.payments.createCharge({
		orderId: created.order.id,
		amountCents: created.order.grossCents,
		method: data.method,
		description: created.productName,
		customer: { name: created.account.name, email: created.account.email, taxId: data.taxId },
		dueAt: addDays(now, PIX_DUE_DAYS)
	});
	await ctx.db
		.update(order)
		.set({ externalId: charge.externalId })
		.where(and(eq(order.id, created.order.id), isNull(order.externalId)));
	return { orderId: created.order.id, charge };
}

/**
 * The payment screen of an order, reloaded or polled until it is paid. The order id is
 * the key, so a guest buyer can follow it; only the status and the charge are shown.
 */
export async function getPaymentStatus(ctx: Ctx, orderId: string) {
	const id = z.uuid().parse(orderId);
	const [row] = await ctx.db
		.select({
			status: order.status,
			externalId: order.externalId,
			grossCents: order.grossCents,
			productId: order.productId,
			productName: product.name
		})
		.from(order)
		.innerJoin(product, eq(product.id, order.productId))
		.where(eq(order.id, id));
	const found = assertFound(row, 'order');
	const charge =
		found.status === 'pending' && found.externalId
			? await ctx.payments.getCharge(found.externalId)
			: null;
	return {
		status: found.status,
		grossCents: found.grossCents,
		product: { id: found.productId, name: found.productName },
		charge
	};
}
