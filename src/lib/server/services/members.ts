// The student's side (RF-23, RF-24): products with access, lessons, progress and orders.

import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '../context';
import type { Db } from '../db/client';
import { enrollment, lesson, lessonProgress, module, order, product, refund } from '../db/schema';
import { assertFound, NotFoundError } from '../errors';

/** RN-16: access while an enrollment of a paid order is active. The producer previews (RF-16). */
async function canView(db: Db, userId: string, productId: string) {
	const [own] = await db
		.select({ id: product.id })
		.from(product)
		.where(and(eq(product.id, productId), eq(product.producerId, userId)));
	if (own) return true;
	const [enrolled] = await db
		.select({ id: enrollment.id })
		.from(enrollment)
		.innerJoin(order, eq(order.id, enrollment.orderId))
		.where(
			and(
				eq(order.studentId, userId),
				eq(order.productId, productId),
				eq(enrollment.status, 'active')
			)
		)
		.limit(1);
	return enrolled !== undefined;
}

/** "Meus produtos": every product the student can open, with progress. */
export async function listMyProducts(ctx: Ctx, studentId: string) {
	const rows = await ctx.db
		.selectDistinct({ id: product.id, name: product.name, brand: product.brand })
		.from(enrollment)
		.innerJoin(order, eq(order.id, enrollment.orderId))
		.innerJoin(product, eq(product.id, order.productId))
		.where(and(eq(order.studentId, studentId), eq(enrollment.status, 'active')));
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const lessons = await ctx.db
		.select({ productId: module.productId, lessonId: lesson.id, done: lessonProgress.lessonId })
		.from(lesson)
		.innerJoin(module, eq(module.id, lesson.moduleId))
		.leftJoin(
			lessonProgress,
			and(eq(lessonProgress.lessonId, lesson.id), eq(lessonProgress.userId, studentId))
		)
		.where(inArray(module.productId, ids));
	return rows.map((r) => {
		const mine = lessons.filter((l) => l.productId === r.id);
		return {
			...r,
			lessonCount: mine.length,
			completedCount: mine.filter((l) => l.done !== null).length
		};
	});
}

/** RF-23: modules and lessons in order, with what the viewer has completed. */
export async function getCourse(ctx: Ctx, userId: string, productId: string) {
	const id = z.uuid().parse(productId);
	if (!(await canView(ctx.db, userId, id))) throw new NotFoundError('product not found');
	const [prod] = await ctx.db
		.select({ id: product.id, name: product.name, brand: product.brand })
		.from(product)
		.where(eq(product.id, id));
	const [modules, lessons] = await Promise.all([
		ctx.db
			.select({ id: module.id, title: module.title })
			.from(module)
			.where(eq(module.productId, id))
			.orderBy(asc(module.position), asc(module.createdAt)),
		ctx.db
			.select({
				id: lesson.id,
				moduleId: lesson.moduleId,
				title: lesson.title,
				videoUrl: lesson.videoUrl,
				body: lesson.body,
				attachmentUrl: lesson.attachmentUrl,
				completedAt: lessonProgress.completedAt
			})
			.from(lesson)
			.innerJoin(module, eq(module.id, lesson.moduleId))
			.leftJoin(
				lessonProgress,
				and(eq(lessonProgress.lessonId, lesson.id), eq(lessonProgress.userId, userId))
			)
			.where(eq(module.productId, id))
			.orderBy(asc(lesson.position), asc(lesson.createdAt))
	]);
	return {
		product: assertFound(prod, 'product'),
		modules: modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) })),
		lessonCount: lessons.length,
		completedCount: lessons.filter((l) => l.completedAt !== null).length
	};
}

/** RF-23: marks or unmarks a lesson; repeating either is harmless. */
export async function setLessonDone(ctx: Ctx, userId: string, lessonId: string, done: boolean) {
	const id = z.uuid().parse(lessonId);
	const [row] = await ctx.db
		.select({ productId: module.productId })
		.from(lesson)
		.innerJoin(module, eq(module.id, lesson.moduleId))
		.where(eq(lesson.id, id));
	if (!row || !(await canView(ctx.db, userId, row.productId))) {
		throw new NotFoundError('lesson not found');
	}
	if (done) {
		await ctx.db.insert(lessonProgress).values({ userId, lessonId: id }).onConflictDoNothing();
	} else {
		await ctx.db
			.delete(lessonProgress)
			.where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, id)));
	}
}

/** RF-24: the student's orders with payment, access and refund status. */
export async function listMyOrders(ctx: Ctx, studentId: string) {
	return ctx.db
		.select({
			id: order.id,
			status: order.status,
			paymentMethod: order.paymentMethod,
			grossCents: order.grossCents,
			guaranteeDays: order.guaranteeDays,
			paidAt: order.paidAt,
			createdAt: order.createdAt,
			productId: product.id,
			productName: product.name,
			enrollmentStatus: enrollment.status,
			refundId: refund.id,
			refundStatus: refund.status,
			refundOwner: refund.owner,
			refundDueAt: refund.dueAt
		})
		.from(order)
		.innerJoin(product, eq(product.id, order.productId))
		.leftJoin(enrollment, eq(enrollment.orderId, order.id))
		.leftJoin(refund, eq(refund.orderId, order.id))
		.where(eq(order.studentId, studentId))
		.orderBy(desc(order.createdAt));
}
