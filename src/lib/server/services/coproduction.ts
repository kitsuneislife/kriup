// Coproduction (RF-50 to RF-53, RN-12). Each row is one version of the terms; a new
// percentage is a new invite, and its acceptance ends the version in force at that instant.

import { createHash } from 'node:crypto';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { contractText } from '../../domain/coproduction';
import { addDays } from '../../domain/money';
import { COPRODUCTION_MAX_BP } from '../../domain/params';
import { assertTransition, COPRODUCTION_TRANSITIONS, DomainError } from '../../domain/states';
import { ACCESS_TOKEN_TTL_MS, createPasswordToken, setPasswordLink } from '../auth/password-token';
import { emailSchema, nameSchema } from '../auth/credentials';
import { type Ctx, link, sendAfterCommit } from '../context';
import type { Tx } from '../db/client';
import { acceptance, coproduction, product, user } from '../db/schema';
import { assertFound, NotFoundError, PG, translate } from '../errors';
import { findOrCreateAccount } from '../users';

export const inviteSchema = z.object({
	productId: z.uuid(),
	email: emailSchema,
	/** Used only when the invitee has no account yet. */
	name: nameSchema,
	percentBp: z.number().int().min(1).max(COPRODUCTION_MAX_BP),
	/** Null means no end date. */
	durationDays: z.number().int().min(1).max(3_650).nullable()
});

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** RF-50, RF-51: the invite carries the contract; the invitee gets an e-mail with it. */
export async function inviteCoproducer(
	ctx: Ctx,
	producerId: string,
	input: z.input<typeof inviteSchema>,
	now = new Date()
): Promise<string> {
	const data = inviteSchema.parse(input);
	const created = await ctx.db.transaction(async (tx) => {
		const [prod] = await tx
			.select({ id: product.id, name: product.name, producerName: user.name })
			.from(product)
			.innerJoin(user, eq(user.id, product.producerId))
			.where(and(eq(product.id, data.productId), eq(product.producerId, producerId)));
		const found = assertFound(prod, 'product');
		const invitee = await findOrCreateAccount(tx, data.email, data.name);
		if (invitee.id === producerId) {
			throw new DomainError('self_coproduction', 'a producer cannot coproduce their own product');
		}
		const [{ versions }] = (await tx
			.select({ versions: count() })
			.from(coproduction)
			.where(
				and(eq(coproduction.productId, found.id), eq(coproduction.coproducerId, invitee.id))
			)) as [{ versions: number }];
		const version = versions + 1;
		const [row] = await translate(
			tx
				.insert(coproduction)
				.values({
					productId: found.id,
					coproducerId: invitee.id,
					percentBp: data.percentBp,
					durationDays: data.durationDays,
					contractVersion: version,
					contractText: contractText({
						productName: found.name,
						producerName: found.producerName,
						coproducerName: invitee.name,
						coproducerEmail: invitee.email,
						percentBp: data.percentBp,
						durationDays: data.durationDays,
						version
					})
				})
				.returning({ id: coproduction.id }),
			[{ code: PG.UNIQUE, constraint: 'coproduction_one_invite', error: 'already_invited' }]
		);
		const token = invitee.hasPassword
			? null
			: await createPasswordToken(tx, invitee.id, ACCESS_TOKEN_TTL_MS, now);
		return {
			id: row!.id,
			invitee,
			token,
			productName: found.name,
			producerName: found.producerName
		};
	});

	const { invitee, token } = created;
	const open = link(ctx, `/coproductions/${created.id}`);
	await sendAfterCommit(ctx, {
		to: invitee.email,
		subject: `Convite de coprodução: ${created.productName}`,
		text: `Olá, ${invitee.name}.\n\n${created.producerName} convidou você para coproduzir ${created.productName}. Leia o contrato e aceite em:\n${open}${
			token
				? `\n\nAntes, defina sua senha (link válido por 7 dias):\n${setPasswordLink(ctx, token)}`
				: ''
		}`
	});
	return created.id;
}

async function lockTerm(tx: Tx, id: string) {
	// A malformed id is a missing invite, never a database or validation error.
	if (!z.uuid().safeParse(id).success) return undefined;
	const [row] = await tx.select().from(coproduction).where(eq(coproduction.id, id)).for('update');
	return row;
}

/**
 * RF-51, RF-52: records who accepted which text, ends the version in force for this pair
 * at this instant, and starts the new one. The database refuses shares over the limit.
 */
export async function acceptInvite(ctx: Ctx, coproducerId: string, id: string, now = new Date()) {
	await ctx.db.transaction(async (tx) => {
		const term = await lockTerm(tx, id);
		if (!term || term.coproducerId !== coproducerId) throw new NotFoundError('invite not found');
		assertTransition(COPRODUCTION_TRANSITIONS, term.status, 'active');

		await tx
			.update(coproduction)
			.set({
				status: 'ended',
				// A version whose duration already ran out keeps its own end.
				endsAt: sql`CASE WHEN ${coproduction.endsAt} < ${now.toISOString()} THEN ${coproduction.endsAt} ELSE ${now.toISOString()}::timestamptz END`
			})
			.where(
				and(
					eq(coproduction.productId, term.productId),
					eq(coproduction.coproducerId, coproducerId),
					eq(coproduction.status, 'active')
				)
			);
		await translate(
			tx
				.update(coproduction)
				.set({
					status: 'active',
					acceptedAt: now,
					endsAt: term.durationDays === null ? null : addDays(now, term.durationDays)
				})
				.where(eq(coproduction.id, term.id)),
			[{ code: PG.CHECK, error: 'share_limit' }]
		);
		await tx.insert(acceptance).values({
			coproductionId: term.id,
			userId: coproducerId,
			contractVersion: term.contractVersion,
			textHash: sha256(term.contractText),
			acceptedAt: now
		});
	});
}

/** The invitee refuses, or the producer withdraws, an invite not yet accepted. */
export async function cancelInvite(ctx: Ctx, actorId: string, id: string) {
	await ctx.db.transaction(async (tx) => {
		const term = await lockTerm(tx, id);
		const [prod] = term
			? await tx
					.select({ producerId: product.producerId })
					.from(product)
					.where(eq(product.id, term.productId))
			: [];
		if (!term || (term.coproducerId !== actorId && prod?.producerId !== actorId)) {
			throw new NotFoundError('invite not found');
		}
		assertTransition(COPRODUCTION_TRANSITIONS, term.status, 'canceled');
		await tx.update(coproduction).set({ status: 'canceled' }).where(eq(coproduction.id, term.id));
	});
}

const termColumns = {
	id: coproduction.id,
	productId: coproduction.productId,
	percentBp: coproduction.percentBp,
	durationDays: coproduction.durationDays,
	contractVersion: coproduction.contractVersion,
	status: coproduction.status,
	createdAt: coproduction.createdAt,
	acceptedAt: coproduction.acceptedAt,
	endsAt: coproduction.endsAt
};

/** The producer's view of one product: every version, with the coproducer. */
export async function listProductCoproductions(ctx: Ctx, producerId: string, productId: string) {
	const [prod] = await ctx.db
		.select({ id: product.id })
		.from(product)
		.where(and(eq(product.id, productId), eq(product.producerId, producerId)));
	assertFound(prod, 'product');
	return ctx.db
		.select({ ...termColumns, coproducerName: user.name, coproducerEmail: user.email })
		.from(coproduction)
		.innerJoin(user, eq(user.id, coproduction.coproducerId))
		.where(eq(coproduction.productId, productId))
		.orderBy(asc(coproduction.createdAt));
}

/** The coproducer's invites and terms, with the product. */
export async function listMyCoproductions(ctx: Ctx, coproducerId: string) {
	return ctx.db
		.select({ ...termColumns, productName: product.name })
		.from(coproduction)
		.innerJoin(product, eq(product.id, coproduction.productId))
		.where(eq(coproduction.coproducerId, coproducerId))
		.orderBy(asc(coproduction.createdAt));
}

/** RF-51: the contract text, for the coproducer or the producer of the product. */
export async function getContract(ctx: Ctx, viewerId: string, id: string) {
	if (!z.uuid().safeParse(id).success) throw new NotFoundError('contract not found');
	const [row] = await ctx.db
		.select({
			...termColumns,
			contractText: coproduction.contractText,
			coproducerId: coproduction.coproducerId,
			producerId: product.producerId,
			productName: product.name
		})
		.from(coproduction)
		.innerJoin(product, eq(product.id, coproduction.productId))
		.where(eq(coproduction.id, id));
	if (!row || (row.coproducerId !== viewerId && row.producerId !== viewerId)) {
		throw new NotFoundError('contract not found');
	}
	const [accepted] = await ctx.db
		.select({ acceptedAt: acceptance.acceptedAt, textHash: acceptance.textHash })
		.from(acceptance)
		.where(eq(acceptance.coproductionId, row.id));
	return { ...row, acceptance: accepted ?? null };
}
