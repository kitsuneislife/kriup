import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { setPasswordWithToken, requestPasswordReset } from '../auth/password-token';
import { createSession, validateSession } from '../auth/session';
import { verifyPassword } from '../auth/password';
import { auditLog, order, user } from '../db/schema';
import { NotFoundError } from '../errors';
import { runDailyJobs } from '../jobs/daily';
import { startCheckout } from './checkout';
import { getCourse, listMyOrders, listMyProducts, setLessonDone } from './members';
import { requestRefund } from './refunds';
import {
	addTicketMessage,
	closeTicket,
	createBlock,
	getSupportQueue,
	getTicket,
	liftBlock,
	listAudit,
	openTicket
} from './support';
import {
	buy,
	days,
	db,
	newUser,
	publishedProduct,
	rejectsCode,
	resetDb,
	testCtx,
	VALID_CPF
} from './testing';

beforeEach(resetDb);

async function enrolled() {
	const ctx = testCtx();
	const producer = await newUser('p@example.com');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	const orderId = await buy(ctx, offerId, 'bia@example.com');
	const [s] = await db.select().from(user).where(eq(user.email, 'bia@example.com'));
	const student = { id: s!.id, email: s!.email, name: s!.name, platformRole: s!.platformRole };
	return { ctx, producer, productId, offerId, orderId, student };
}

describe('members area (RF-23, RF-24, RN-16)', () => {
	it('opens the course, tracks progress and closes it after a refund', async () => {
		const { ctx, producer, productId, orderId, student } = await enrolled();
		const course = await getCourse(ctx, student.id, productId);
		const first = course.modules[0]!.lessons[0]!;
		await setLessonDone(ctx, student.id, first.id, true);
		await setLessonDone(ctx, student.id, first.id, true);
		expect((await getCourse(ctx, student.id, productId)).completedCount).toBe(1);
		expect(await listMyProducts(ctx, student.id)).toMatchObject([
			{ id: productId, completedCount: 1, lessonCount: course.lessonCount }
		]);
		expect(await getCourse(ctx, producer.id, productId)).toBeTruthy(); // preview (RF-16)

		const stranger = await newUser('z@example.com');
		await expect(getCourse(ctx, stranger.id, productId)).rejects.toBeInstanceOf(NotFoundError);

		await requestRefund(ctx, student.id, { orderId, reason: 'x' });
		await expect(getCourse(ctx, student.id, productId)).rejects.toBeInstanceOf(NotFoundError);
		expect(await listMyOrders(ctx, student.id)).toMatchObject([
			{ status: 'refunded', enrollmentStatus: 'revoked', refundStatus: 'completed' }
		]);
	});
});

describe('password links (RF-02, RF-03)', () => {
	it('sets the first password once and drops old sessions', async () => {
		const { ctx, student } = await enrolled();
		const token = ctx.mail.sent[0]!.text.match(/\/password\/([\w-]+)/)![1]!;
		const { token: session } = await createSession(db, student.id);

		const userId = await setPasswordWithToken(ctx, { token, password: 'pão quentinho' });
		expect(userId).toBe(student.id);
		const [row] = await db.select().from(user).where(eq(user.id, student.id));
		expect(await verifyPassword(row!.passwordHash!, 'pão quentinho')).toBe(true);
		expect(await validateSession(db, session)).toBeNull();
		await rejectsCode(
			setPasswordWithToken(ctx, { token, password: 'outra senha' }),
			'invalid_token'
		);
	});

	it('sends a reset link only to an existing account and expires it', async () => {
		const ctx = testCtx();
		await newUser('a@example.com');
		const now = new Date('2026-11-01T12:00:00Z');
		await requestPasswordReset(ctx, 'nobody@example.com', now);
		await requestPasswordReset(ctx, 'not an email', now);
		expect(ctx.mail.sent).toHaveLength(0);
		await requestPasswordReset(ctx, 'A@example.com', now);
		const token = ctx.mail.sent[0]!.text.match(/\/password\/([\w-]+)/)![1]!;
		await rejectsCode(
			setPasswordWithToken(ctx, { token, password: '12345678' }, days(now, 1)),
			'invalid_token'
		);
	});
});

describe('support (RF-35, RF-60 to RF-62)', () => {
	it('handles a ticket from the student to support, audited', async () => {
		const { ctx, orderId, student } = await enrolled();
		const support = await newUser('s@example.com', 'support');
		const id = await openTicket(ctx, student.id, {
			orderId,
			subject: 'Não acho o certificado',
			body: 'Onde fica?'
		});
		expect((await getSupportQueue(ctx, support)).tickets).toHaveLength(1);
		await addTicketMessage(ctx, support, id, 'Fica no último módulo.');
		const stranger = await newUser('z@example.com');
		await expect(getTicket(ctx, stranger, id)).rejects.toBeInstanceOf(NotFoundError);

		await closeTicket(ctx, support, id);
		await rejectsCode(addTicketMessage(ctx, student, id, 'obrigada'), 'invalid_transition');
		expect((await getTicket(ctx, student, id)).messages).toHaveLength(2);
		expect(await db.select().from(auditLog)).toMatchObject([{ action: 'ticket.close' }]);
	});

	it('blocks with a reason and lifts, both audited; support screens are support only', async () => {
		const { ctx, producer, student } = await enrolled();
		const support = await newUser('s@example.com', 'support');
		await expect(getSupportQueue(ctx, student)).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			createBlock(ctx, student.id, {
				userId: producer.id,
				target: 'account',
				reason: 'x',
				nextStep: 'y'
			})
		).rejects.toBeInstanceOf(NotFoundError);
		await expect(
			createBlock(ctx, support.id, {
				userId: producer.id,
				target: 'account',
				reason: ' ',
				nextStep: 'y'
			})
		).rejects.toThrow();

		const id = await createBlock(ctx, support.id, {
			userId: producer.id,
			target: 'account',
			reason: 'Documento pendente',
			nextStep: 'Envie o documento'
		});
		await liftBlock(ctx, support.id, id);
		await expect(liftBlock(ctx, support.id, id)).rejects.toBeInstanceOf(NotFoundError);
		expect((await listAudit(ctx, support)).map((a) => a.action)).toEqual([
			'block.lift',
			'block.create'
		]);
	});
});

describe('daily job', () => {
	it('expires orders whose charge never got created', async () => {
		const { ctx, offerId } = await enrolled();
		const now = new Date();
		const { orderId } = await startCheckout(ctx, null, {
			offerId,
			method: 'pix',
			name: 'C',
			email: 'c@example.com',
			taxId: VALID_CPF
		});
		await db.update(order).set({ externalId: null }).where(eq(order.id, orderId));
		expect((await runDailyJobs(ctx, days(now, 0.5))).abandonedOrders).toBe(0);
		expect((await runDailyJobs(ctx, days(now, 2))).abandonedOrders).toBe(1);
		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		expect(o!.status).toBe('expired');
	});
});
