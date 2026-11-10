// What the provider reports (RF-22, RN-15). Every event is idempotent: the order row is
// locked and its status decides, so a repeated or late webhook changes nothing.

import { and, eq, isNotNull } from 'drizzle-orm';
import { termsInForce } from '../../domain/coproduction';
import { releaseAt } from '../../domain/retention';
import { splitSale } from '../../domain/split';
import { canTransition, ORDER_TRANSITIONS } from '../../domain/states';
import { ACCESS_TOKEN_TTL_MS, createPasswordToken, setPasswordLink } from '../auth/password-token';
import { type Ctx, link, sendAfterCommit } from '../context';
import type { Tx } from '../db/client';
import { coproduction, enrollment, ledgerEntry, order, page, product, user } from '../db/schema';
import type { PaymentEvent } from '../payment/gateway';
import { completeRefundFromProvider } from './refunds';

export type EventOutcome = 'applied' | 'ignored' | 'unknown_charge';

export async function handlePaymentEvent(
	ctx: Ctx,
	event: PaymentEvent,
	now = new Date()
): Promise<EventOutcome> {
	switch (event.type) {
		case 'paid':
			return confirmPayment(ctx, event, now);
		case 'expired':
		case 'declined':
			return closeUnpaid(ctx, event, event.type);
		case 'refunded':
			return completeRefundFromProvider(ctx, event.externalId, now);
	}
}

async function lockOrder(tx: Tx, externalId: string) {
	const [row] = await tx.select().from(order).where(eq(order.externalId, externalId)).for('update');
	return row;
}

async function closeUnpaid(
	ctx: Ctx,
	event: PaymentEvent,
	status: 'expired' | 'declined'
): Promise<EventOutcome> {
	return ctx.db.transaction(async (tx) => {
		const row = await lockOrder(tx, event.externalId);
		if (!row) return 'unknown_charge';
		if (!canTransition(ORDER_TRANSITIONS, row.status, status)) return 'ignored';
		await tx.update(order).set({ status }).where(eq(order.id, row.id));
		return 'applied';
	});
}

/**
 * RF-22 and RF-40, in one transaction: the order is paid, the enrollment grants access,
 * and each party gets a held sale entry split by the coproduction terms in force at the
 * payment (RN-05, RN-12). Then the access e-mail goes out.
 */
async function confirmPayment(ctx: Ctx, event: PaymentEvent, now: Date): Promise<EventOutcome> {
	const result = await ctx.db.transaction(async (tx) => {
		const row = await lockOrder(tx, event.externalId);
		if (!row) return { outcome: 'unknown_charge' as const };
		if (!canTransition(ORDER_TRANSITIONS, row.status, 'paid')) {
			return { outcome: 'ignored' as const };
		}
		if (event.amountCents !== row.grossCents) {
			// The provider charged something else than the order: never guess, stop loudly.
			throw new Error(
				`order ${row.id} charged ${event.amountCents} cents, expected ${row.grossCents}`
			);
		}

		await tx.update(order).set({ status: 'paid', paidAt: now }).where(eq(order.id, row.id));
		await tx.insert(enrollment).values({ orderId: row.id });

		const [prod] = await tx
			.select({ id: product.id, name: product.name, producerId: product.producerId })
			.from(product)
			.where(eq(product.id, row.productId));
		const terms = termsInForce(
			(
				await tx
					.select({
						id: coproduction.id,
						coproducerId: coproduction.coproducerId,
						bp: coproduction.percentBp,
						effectiveFrom: coproduction.acceptedAt,
						endsAt: coproduction.endsAt
					})
					.from(coproduction)
					.where(and(eq(coproduction.productId, row.productId), isNotNull(coproduction.acceptedAt)))
			).map((t) => ({ ...t, effectiveFrom: t.effectiveFrom! })),
			now
		);
		const split = splitSale(
			row.grossCents,
			row.feeCents,
			terms.map((t) => t.bp)
		);
		const release = releaseAt(now, row.guaranteeDays);
		const sale = {
			type: 'sale' as const,
			state: 'held' as const,
			orderId: row.id,
			releaseAt: release
		};

		await tx.insert(ledgerEntry).values([
			{
				...sale,
				userId: prod!.producerId,
				amountCents: split.producerCents,
				reason: `Venda de ${prod!.name}, retida até o fim da garantia`
			},
			// A share that rounds to zero cents has nothing to record.
			...terms.flatMap((term, i) =>
				split.coproducerCents[i]! > 0
					? [
							{
								...sale,
								userId: term.coproducerId,
								coproductionId: term.id,
								amountCents: split.coproducerCents[i]!,
								reason: `Coprodução em ${prod!.name} (${term.bp / 100}%), retida até o fim da garantia`
							}
						]
					: []
			)
		]);

		const [student] = await tx
			.select({ email: user.email, name: user.name, passwordHash: user.passwordHash })
			.from(user)
			.where(eq(user.id, row.studentId));
		const token =
			student!.passwordHash === null
				? await createPasswordToken(tx, row.studentId, ACCESS_TOKEN_TTL_MS, now)
				: null;
		const [accessEmail] = await tx
			.select({ content: page.content })
			.from(page)
			.where(and(eq(page.productId, row.productId), eq(page.type, 'access_email')));

		return {
			outcome: 'applied' as const,
			mail: {
				student: student!,
				token,
				product: prod!,
				fields: accessEmail?.content.sections[0]?.fields
			}
		};
	});

	if (result.outcome === 'applied') {
		const { student, token, product: prod, fields } = result.mail;
		const steps = token
			? `Para entrar, defina sua senha neste link (vale por 7 dias):\n${setPasswordLink(ctx, token)}`
			: `Entre com seu e-mail e senha:\n${link(ctx, '/student')}`;
		await sendAfterCommit(ctx, {
			to: student.email,
			subject: fields?.subject?.trim() || `Seu acesso a ${prod.name}`,
			text: `${fields?.body?.trim() || `Olá, ${student.name}! Sua compra de ${prod.name} foi confirmada.`}\n\n${steps}`
		});
	}
	return result.outcome;
}
