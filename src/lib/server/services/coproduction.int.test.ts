import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { acceptance, coproduction, user } from '../db/schema';
import { NotFoundError } from '../errors';
import {
	acceptInvite,
	cancelInvite,
	getContract,
	inviteCoproducer,
	listMyCoproductions,
	listProductCoproductions
} from './coproduction';
import { days, db, newUser, publishedProduct, rejectsCode, resetDb, testCtx } from './testing';

beforeEach(resetDb);

const AT = new Date('2026-11-01T12:00:00Z');

async function setup() {
	const ctx = testCtx();
	const producer = await newUser('p@example.com');
	const { productId } = await publishedProduct(ctx, producer.id);
	const invite = (email: string, percentBp: number, durationDays: number | null = null) =>
		inviteCoproducer(
			ctx,
			producer.id,
			{ productId, email, name: 'Co', percentBp, durationDays },
			AT
		);
	const accountOf = async (email: string) =>
		(await db.select().from(user).where(eq(user.email, email)))[0]!;
	return { ctx, producer, productId, invite, accountOf };
}

describe('invite and acceptance (RF-50 to RF-52)', () => {
	it('creates the invitee, e-mails the contract and records the acceptance', async () => {
		const { ctx, producer, invite, accountOf } = await setup();
		const id = await invite('co@example.com', 2_500, 90);
		const co = await accountOf('co@example.com');
		expect(co.passwordHash).toBeNull();
		expect(ctx.mail.sent.at(-1)!.text).toContain(`http://app.test/coproductions/${id}`);
		expect(ctx.mail.sent.at(-1)!.text).toContain('/password/');

		await acceptInvite(ctx, co.id, id, days(AT, 1));
		const contract = await getContract(ctx, co.id, id);
		expect(contract).toMatchObject({
			status: 'active',
			acceptedAt: days(AT, 1),
			endsAt: days(AT, 91)
		});
		const [proof] = await db.select().from(acceptance);
		expect(proof!.textHash).toBe(createHash('sha256').update(contract.contractText).digest('hex'));
		expect(await getContract(ctx, producer.id, id)).toBeTruthy();
		await expect(getContract(ctx, (await newUser('z@example.com')).id, id)).rejects.toBeInstanceOf(
			NotFoundError
		);
	});

	it('ends the old version when a new percentage is accepted', async () => {
		const { ctx, invite, accountOf, producer, productId } = await setup();
		const v1 = await invite('co@example.com', 2_000);
		const co = await accountOf('co@example.com');
		await acceptInvite(ctx, co.id, v1, days(AT, 1));
		const v2 = await invite('co@example.com', 3_000);
		await acceptInvite(ctx, co.id, v2, days(AT, 5));

		const rows = await listProductCoproductions(ctx, producer.id, productId);
		expect(rows.map((r) => [r.contractVersion, r.status, r.endsAt])).toEqual([
			[1, 'ended', days(AT, 5)],
			[2, 'active', null]
		]);
		expect(await listMyCoproductions(ctx, co.id)).toHaveLength(2);
	});

	it('refuses shares above the limit, self-coproduction and a second pending invite', async () => {
		const { ctx, invite, accountOf } = await setup();
		const a = await invite('a@example.com', 6_000);
		await acceptInvite(ctx, (await accountOf('a@example.com')).id, a, AT);
		const b = await invite('b@example.com', 4_000);
		await rejectsCode(
			acceptInvite(ctx, (await accountOf('b@example.com')).id, b, AT),
			'share_limit'
		);

		await rejectsCode(invite('p@example.com', 1_000), 'self_coproduction');
		await rejectsCode(invite('b@example.com', 1_000), 'already_invited');
	});

	it('lets the invitee or the producer cancel a pending invite, and nobody else', async () => {
		const { ctx, producer, invite, accountOf } = await setup();
		const id = await invite('co@example.com', 1_000);
		const stranger = await newUser('z@example.com');
		await expect(cancelInvite(ctx, stranger.id, id)).rejects.toBeInstanceOf(NotFoundError);
		await cancelInvite(ctx, producer.id, id);
		const [row] = await db.select().from(coproduction).where(eq(coproduction.id, id));
		expect(row!.status).toBe('canceled');
		await rejectsCode(
			acceptInvite(ctx, (await accountOf('co@example.com')).id, id),
			'invalid_transition'
		);
	});

	it('treats a malformed id as missing, not as a database error', async () => {
		const { ctx, producer, productId } = await setup();
		await expect(cancelInvite(ctx, producer.id, 'nope')).rejects.toBeInstanceOf(NotFoundError);
		await expect(acceptInvite(ctx, producer.id, 'nope')).rejects.toBeInstanceOf(NotFoundError);
		await expect(getContract(ctx, producer.id, 'nope')).rejects.toBeInstanceOf(NotFoundError);
		await expect(listProductCoproductions(ctx, producer.id, 'nope')).rejects.toBeInstanceOf(
			NotFoundError
		);
		await expect(
			inviteCoproducer(ctx, producer.id, {
				productId: 'nope',
				email: 'co@example.com',
				name: 'Co',
				percentBp: 1_000,
				durationDays: null
			})
		).rejects.toBeInstanceOf(NotFoundError);
		expect(await listProductCoproductions(ctx, producer.id, productId)).toEqual([]);
	});
});
