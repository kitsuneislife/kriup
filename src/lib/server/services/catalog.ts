// Guided creation and the product editor (RF-10 to RF-16), plus the public pages that
// sell a product (RF-20). Every producer action checks ownership in the query itself.

import { and, asc, count, desc, eq, min } from 'drizzle-orm';
import { z } from 'zod';
import { fillDeep } from '../../domain/draft';
import { GUARANTEE_DAYS, OFFER_MIN_PRICE_CENTS } from '../../domain/params';
import { isPageFilled, publishPendencies } from '../../domain/publish';
import { platformFee } from '../../domain/split';
import { assertTransition, DomainError, PRODUCT_TRANSITIONS } from '../../domain/states';
import type { Ctx } from '../context';
import type { Db, Tx } from '../db/client';
import {
	lesson,
	module,
	offer,
	page,
	type PageType,
	pageType,
	product,
	template
} from '../db/schema';
import { assertFound, PG, translate } from '../errors';
import { activeBlocks, assertNotBlocked } from './blocks';

// ---------------------------------------------------------------------------
// Input schemas (trust boundary)

const text = (max: number) => z.string().trim().min(1).max(max);
const httpsUrl = z.url({ protocol: /^https?$/ });

export const brandSchema = z.object({
	logoUrl: httpsUrl.nullable(),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.transform((c) => c.toLowerCase()),
	font: text(60)
});

const priceSchema = z.number().int().min(OFFER_MIN_PRICE_CENTS).max(100_000_000);

export const createProductSchema = z.object({
	templateSlug: text(60),
	name: text(120),
	audience: text(200),
	priceCents: priceSchema,
	brand: brandSchema
});

export const updateProductSchema = z.object({
	name: text(120).optional(),
	brand: brandSchema.optional(),
	refundPolicy: z.string().trim().max(5_000).optional()
});

export const pageContentSchema = z.object({
	sections: z
		.array(
			z.object({
				kind: text(40),
				fields: z.record(text(40), z.string().max(5_000))
			})
		)
		.max(30)
});

export const lessonSchema = z.object({
	title: text(200),
	videoUrl: httpsUrl.nullable().default(null),
	body: z.string().max(20_000).nullable().default(null),
	attachmentUrl: httpsUrl.nullable().default(null)
});

/** Only one-time offers until decision D5 (subscriptions) is made. */
export const offerSchema = z.object({
	name: text(80),
	priceCents: priceSchema,
	guaranteeDays: z.number().int().min(GUARANTEE_DAYS).max(365).default(GUARANTEE_DAYS)
});

const idList = z.array(z.uuid()).max(500);

// ---------------------------------------------------------------------------
// Ownership

async function ownedProduct(db: Db | Tx, producerId: string, productId: string) {
	// The id comes from the address: a malformed one fails here, never in the database.
	const id = z.uuid().parse(productId);
	const [row] = await db
		.select()
		.from(product)
		.where(and(eq(product.id, id), eq(product.producerId, producerId)));
	return assertFound(row, 'product');
}

async function ownedModule(db: Db | Tx, producerId: string, moduleId: string) {
	const [row] = await db
		.select({ id: module.id, productId: module.productId })
		.from(module)
		.innerJoin(product, eq(product.id, module.productId))
		.where(and(eq(module.id, moduleId), eq(product.producerId, producerId)));
	return assertFound(row, 'module');
}

async function ownedLesson(db: Db | Tx, producerId: string, lessonId: string) {
	const [row] = await db
		.select({ id: lesson.id, moduleId: lesson.moduleId })
		.from(lesson)
		.innerJoin(module, eq(module.id, lesson.moduleId))
		.innerJoin(product, eq(product.id, module.productId))
		.where(and(eq(lesson.id, lessonId), eq(product.producerId, producerId)));
	return assertFound(row, 'lesson');
}

async function ownedOffer(db: Db | Tx, producerId: string, offerId: string) {
	const [row] = await db
		.select({ id: offer.id, productId: offer.productId })
		.from(offer)
		.innerJoin(product, eq(product.id, offer.productId))
		.where(and(eq(offer.id, offerId), eq(product.producerId, producerId)));
	return assertFound(row, 'offer');
}

// ---------------------------------------------------------------------------
// Guided creation (RF-10 to RF-12)

export async function listTemplates(ctx: Ctx) {
	return ctx.db
		.select({
			slug: template.slug,
			name: template.name,
			productType: template.productType,
			structure: template.structure
		})
		.from(template)
		.orderBy(asc(template.name));
}

const brl = (cents: number) =>
	new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

/**
 * RF-10 and RF-11: the wizard answers become a full draft. Pages, refund policy, modules
 * and lessons come from the template with the answers filled in; the brand applies to
 * every page (RF-12); the price becomes the first offer. Returns the new product id.
 */
export async function createProduct(
	ctx: Ctx,
	producerId: string,
	input: z.input<typeof createProductSchema>
): Promise<string> {
	const answers = createProductSchema.parse(input);
	return ctx.db.transaction(async (tx) => {
		const [tpl] = await tx.select().from(template).where(eq(template.slug, answers.templateSlug));
		const { structure } = assertFound(tpl, 'template');
		const filled = fillDeep(structure, {
			productName: answers.name,
			audience: answers.audience,
			price: brl(answers.priceCents)
		});

		const [created] = await tx
			.insert(product)
			.values({
				producerId,
				templateId: tpl!.id,
				name: answers.name,
				type: tpl!.productType,
				brand: answers.brand,
				refundPolicy: filled.refundPolicy
			})
			.returning({ id: product.id });
		const productId = created!.id;

		await tx
			.insert(page)
			.values(
				pageType.enumValues.map((type) => ({ productId, type, content: filled.pages[type] }))
			);
		for (const [position, mod] of filled.modules.entries()) {
			const [m] = await tx
				.insert(module)
				.values({ productId, title: mod.title, position })
				.returning({ id: module.id });
			if (mod.lessons.length > 0) {
				await tx
					.insert(lesson)
					.values(mod.lessons.map((l, i) => ({ moduleId: m!.id, title: l.title, position: i })));
			}
		}
		await tx
			.insert(offer)
			.values({ productId, name: 'Oferta principal', priceCents: answers.priceCents });
		return productId;
	});
}

// ---------------------------------------------------------------------------
// Producer reads

/** Newest first, each with its offer count and lowest price (null without offers). */
export async function listProducerProducts(ctx: Ctx, producerId: string) {
	return ctx.db
		.select({
			id: product.id,
			name: product.name,
			type: product.type,
			status: product.status,
			brand: product.brand,
			publishedAt: product.publishedAt,
			createdAt: product.createdAt,
			minPriceCents: min(offer.priceCents),
			offerCount: count(offer.id)
		})
		.from(product)
		.leftJoin(offer, eq(offer.productId, product.id))
		.where(eq(product.producerId, producerId))
		.groupBy(product.id)
		.orderBy(desc(product.createdAt), desc(product.id));
}

/** Everything the editor shows, including pendencies (RF-15) and the fee per offer (RN-02). */
export async function getProductEditor(
	ctx: Ctx,
	producerId: string,
	productId: string,
	now = new Date()
) {
	const prod = await ownedProduct(ctx.db, producerId, productId);
	const [pages, modules, lessons, offers, blocks] = await Promise.all([
		ctx.db.select().from(page).where(eq(page.productId, productId)),
		ctx.db
			.select()
			.from(module)
			.where(eq(module.productId, productId))
			.orderBy(asc(module.position), asc(module.createdAt)),
		ctx.db
			.select({
				id: lesson.id,
				moduleId: lesson.moduleId,
				title: lesson.title,
				videoUrl: lesson.videoUrl,
				body: lesson.body,
				attachmentUrl: lesson.attachmentUrl,
				position: lesson.position
			})
			.from(lesson)
			.innerJoin(module, eq(module.id, lesson.moduleId))
			.where(eq(module.productId, productId))
			.orderBy(asc(lesson.position), asc(lesson.createdAt)),
		ctx.db.select().from(offer).where(eq(offer.productId, productId)).orderBy(asc(offer.createdAt)),
		activeBlocks(ctx.db, producerId, now)
	]);

	return {
		product: prod,
		pages: Object.fromEntries(pages.map((p) => [p.type, p.content])) as Record<
			PageType,
			(typeof pages)[number]['content']
		>,
		modules: modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) })),
		offers: offers.map((o) => ({ ...o, feeCents: platformFee(o.priceCents) })),
		pendencies: pendenciesOf(prod.refundPolicy, pages, offers.length, lessons.length),
		blocks: blocks.filter((b) => b.target === 'account' || b.productId === productId)
	};
}

function pendenciesOf(
	refundPolicy: string,
	pages: { type: PageType; content: z.infer<typeof pageContentSchema> }[],
	offerCount: number,
	lessonCount: number
) {
	const sales = pages.find((p) => p.type === 'sales');
	return publishPendencies({
		offerCount,
		lessonCount,
		refundPolicy,
		salesPageFilled: sales !== undefined && isPageFilled(sales.content)
	});
}

// ---------------------------------------------------------------------------
// Editor (RF-12 to RF-14)

export async function updateProduct(
	ctx: Ctx,
	producerId: string,
	productId: string,
	input: z.input<typeof updateProductSchema>
) {
	const changes = updateProductSchema.parse(input);
	await ownedProduct(ctx.db, producerId, productId);
	if (Object.keys(changes).length === 0) return;
	await ctx.db.update(product).set(changes).where(eq(product.id, productId));
}

export async function updatePage(
	ctx: Ctx,
	producerId: string,
	productId: string,
	type: PageType,
	input: z.input<typeof pageContentSchema>
) {
	const content = pageContentSchema.parse(input);
	const pageKind = z.enum(pageType.enumValues).parse(type);
	await ownedProduct(ctx.db, producerId, productId);
	await ctx.db
		.update(page)
		.set({ content })
		.where(and(eq(page.productId, productId), eq(page.type, pageKind)));
}

export async function addModule(ctx: Ctx, producerId: string, productId: string, title: string) {
	const name = text(200).parse(title);
	await ownedProduct(ctx.db, producerId, productId);
	const [{ n }] = (await ctx.db
		.select({ n: count() })
		.from(module)
		.where(eq(module.productId, productId))) as [{ n: number }];
	const [row] = await ctx.db
		.insert(module)
		.values({ productId, title: name, position: n })
		.returning({ id: module.id });
	return row!.id;
}

export async function renameModule(ctx: Ctx, producerId: string, moduleId: string, title: string) {
	const name = text(200).parse(title);
	await ownedModule(ctx.db, producerId, moduleId);
	await ctx.db.update(module).set({ title: name }).where(eq(module.id, moduleId));
}

/** Deletes the module with its lessons and the students' progress on them. */
export async function deleteModule(ctx: Ctx, producerId: string, moduleId: string) {
	await ownedModule(ctx.db, producerId, moduleId);
	await ctx.db.delete(module).where(eq(module.id, moduleId));
}

/** `ids` must list every module of the product exactly once, in the new order. */
export async function reorderModules(
	ctx: Ctx,
	producerId: string,
	productId: string,
	ids: string[]
) {
	const order = idList.parse(ids);
	await ctx.db.transaction(async (tx) => {
		await ownedProduct(tx, producerId, productId);
		const current = await tx
			.select({ id: module.id })
			.from(module)
			.where(eq(module.productId, productId));
		assertSameIds(
			current.map((r) => r.id),
			order
		);
		for (const [position, id] of order.entries()) {
			await tx.update(module).set({ position }).where(eq(module.id, id));
		}
	});
}

export async function addLesson(
	ctx: Ctx,
	producerId: string,
	moduleId: string,
	input: z.input<typeof lessonSchema>
) {
	const values = lessonSchema.parse(input);
	await ownedModule(ctx.db, producerId, moduleId);
	const [{ n }] = (await ctx.db
		.select({ n: count() })
		.from(lesson)
		.where(eq(lesson.moduleId, moduleId))) as [{ n: number }];
	const [row] = await ctx.db
		.insert(lesson)
		.values({ ...values, moduleId, position: n })
		.returning({ id: lesson.id });
	return row!.id;
}

export async function updateLesson(
	ctx: Ctx,
	producerId: string,
	lessonId: string,
	input: z.input<typeof lessonSchema>
) {
	const values = lessonSchema.parse(input);
	await ownedLesson(ctx.db, producerId, lessonId);
	await ctx.db.update(lesson).set(values).where(eq(lesson.id, lessonId));
}

export async function deleteLesson(ctx: Ctx, producerId: string, lessonId: string) {
	await ownedLesson(ctx.db, producerId, lessonId);
	await ctx.db.delete(lesson).where(eq(lesson.id, lessonId));
}

/** `ids` must list every lesson of the module exactly once, in the new order. */
export async function reorderLessons(
	ctx: Ctx,
	producerId: string,
	moduleId: string,
	ids: string[]
) {
	const order = idList.parse(ids);
	await ctx.db.transaction(async (tx) => {
		await ownedModule(tx, producerId, moduleId);
		const current = await tx
			.select({ id: lesson.id })
			.from(lesson)
			.where(eq(lesson.moduleId, moduleId));
		assertSameIds(
			current.map((r) => r.id),
			order
		);
		for (const [position, id] of order.entries()) {
			await tx.update(lesson).set({ position }).where(eq(lesson.id, id));
		}
	});
}

function assertSameIds(current: string[], next: string[]) {
	const a = [...current].sort();
	const b = [...next].sort();
	if (a.length !== b.length || a.some((id, i) => id !== b[i])) {
		throw new DomainError('invalid_transition', 'the new order must list every item once');
	}
}

// ---------------------------------------------------------------------------
// Offers. Orders copy price and guarantee, so editing an offer never rewrites a sale.

export async function addOffer(
	ctx: Ctx,
	producerId: string,
	productId: string,
	input: z.input<typeof offerSchema>
) {
	const values = offerSchema.parse(input);
	await ownedProduct(ctx.db, producerId, productId);
	const [row] = await ctx.db
		.insert(offer)
		.values({ ...values, productId })
		.returning({ id: offer.id });
	return row!.id;
}

export async function updateOffer(
	ctx: Ctx,
	producerId: string,
	offerId: string,
	input: z.input<typeof offerSchema>
) {
	const values = offerSchema.parse(input);
	await ownedOffer(ctx.db, producerId, offerId);
	await ctx.db.update(offer).set(values).where(eq(offer.id, offerId));
}

/** An offer with orders stays: the sales point at it. */
export async function deleteOffer(ctx: Ctx, producerId: string, offerId: string) {
	await ownedOffer(ctx.db, producerId, offerId);
	await translate(ctx.db.delete(offer).where(eq(offer.id, offerId)), [
		{ code: PG.FOREIGN_KEY, error: 'offer_has_orders' }
	]);
}

// ---------------------------------------------------------------------------
// Publish (RN-01, RF-15)

/** Goes live once there are no pendencies and no block on the account or the product. */
export async function publishProduct(
	ctx: Ctx,
	producerId: string,
	productId: string,
	now = new Date()
) {
	await ctx.db.transaction(async (tx) => {
		const [prod] = await tx
			.select()
			.from(product)
			.where(and(eq(product.id, productId), eq(product.producerId, producerId)))
			.for('update');
		const current = assertFound(prod, 'product');
		assertTransition(PRODUCT_TRANSITIONS, current.status, 'published');
		await assertNotBlocked(tx, producerId, ['product'], productId, now);

		const [pages, [offers], [lessons]] = await Promise.all([
			tx.select().from(page).where(eq(page.productId, productId)),
			tx.select({ n: count() }).from(offer).where(eq(offer.productId, productId)),
			tx
				.select({ n: count() })
				.from(lesson)
				.innerJoin(module, eq(module.id, lesson.moduleId))
				.where(eq(module.productId, productId))
		]);
		const pendencies = pendenciesOf(current.refundPolicy, pages, offers!.n, lessons!.n);
		if (pendencies.length > 0) {
			throw new DomainError('publish_pendencies', `missing: ${pendencies.join(', ')}`);
		}
		await tx
			.update(product)
			.set({ status: 'published', publishedAt: now })
			.where(eq(product.id, productId));
	});
}

// ---------------------------------------------------------------------------
// Public (RF-20)

/** A product is on sale while published and neither it nor its producer is blocked. */
export async function onSale(db: Db | Tx, productId: string, now: Date) {
	const [prod] = await db
		.select({
			id: product.id,
			producerId: product.producerId,
			name: product.name,
			type: product.type,
			brand: product.brand,
			refundPolicy: product.refundPolicy,
			status: product.status
		})
		.from(product)
		.where(eq(product.id, productId));
	if (!prod || prod.status !== 'published') return null;
	const blocks = await activeBlocks(db, prod.producerId, now);
	if (blocks.some((b) => b.target === 'account' || b.productId === productId)) return null;
	return prod;
}

/** RF-20: the public sales page with the offers on sale; NotFound when not on sale. */
export async function getSalesPage(ctx: Ctx, productId: string, now = new Date()) {
	const prod = assertFound(await onSale(ctx.db, productId, now), 'product');
	const [[sales], offers] = await Promise.all([
		ctx.db
			.select({ content: page.content })
			.from(page)
			.where(and(eq(page.productId, productId), eq(page.type, 'sales'))),
		ctx.db
			.select({
				id: offer.id,
				name: offer.name,
				priceCents: offer.priceCents,
				guaranteeDays: offer.guaranteeDays
			})
			.from(offer)
			.where(and(eq(offer.productId, productId), eq(offer.recurrence, 'one_time')))
			.orderBy(asc(offer.priceCents))
	]);
	return {
		product: {
			id: prod.id,
			name: prod.name,
			type: prod.type,
			brand: prod.brand,
			refundPolicy: prod.refundPolicy
		},
		page: sales!.content,
		offers
	};
}

/** The checkout page of one offer, or NotFound when its product is not on sale. */
export async function getCheckout(ctx: Ctx, offerId: string, now = new Date()) {
	const [off] = await ctx.db.select().from(offer).where(eq(offer.id, offerId));
	const found = assertFound(off, 'offer');
	const prod = assertFound(await onSale(ctx.db, found.productId, now), 'product');
	const [checkout] = await ctx.db
		.select({ content: page.content })
		.from(page)
		.where(and(eq(page.productId, prod.id), eq(page.type, 'checkout')));
	return {
		product: { id: prod.id, name: prod.name, brand: prod.brand, refundPolicy: prod.refundPolicy },
		offer: {
			id: found.id,
			name: found.name,
			priceCents: found.priceCents,
			guaranteeDays: found.guaranteeDays
		},
		page: checkout!.content
	};
}
