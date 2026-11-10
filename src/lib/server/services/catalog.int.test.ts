import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { lesson, module } from '../db/schema';
import { NotFoundError } from '../errors';
import {
	addLesson,
	addModule,
	createProduct,
	deleteModule,
	deleteOffer,
	getCheckout,
	getProductEditor,
	getSalesPage,
	listTemplates,
	publishProduct,
	reorderModules,
	updatePage
} from './catalog';
import { createBlock } from './support';
import {
	brand,
	buy,
	db,
	newUser,
	publishedProduct,
	rejectsCode,
	resetDb,
	testCtx
} from './testing';

beforeEach(resetDb);

const answers = {
	templateSlug: 'online-course',
	name: 'Curso de pão',
	audience: 'iniciantes',
	priceCents: 9_700,
	brand
};

describe('guided creation (RF-10 to RF-12)', () => {
	it('drafts pages, policy, lessons and an offer from every template', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const templates = await listTemplates(ctx);
		expect(templates.map((t) => t.slug).sort()).toEqual(['mentorship', 'online-course']);

		for (const { slug } of templates) {
			const id = await createProduct(ctx, producer.id, { ...answers, templateSlug: slug });
			const editor = await getProductEditor(ctx, producer.id, id);
			expect(editor.product.status).toBe('draft');
			expect(editor.product.brand).toEqual(brand);
			expect(Object.keys(editor.pages).sort()).toEqual(['access_email', 'checkout', 'sales']);
			const sales = JSON.stringify(editor.pages.sales);
			expect(sales).toContain('Curso de pão');
			expect(sales).toContain('iniciantes');
			expect(sales).toContain('R$');
			expect(sales).not.toContain('{{');
			expect(editor.product.refundPolicy).toContain('Curso de pão');
			expect(editor.modules.flatMap((m) => m.lessons).length).toBeGreaterThan(0);
			expect(editor.offers).toMatchObject([{ priceCents: 9_700, feeCents: 734 }]);
			expect(editor.pendencies).toEqual([]);
		}
	});

	it('refuses invalid answers before touching the database', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		await expect(
			createProduct(ctx, producer.id, { ...answers, priceCents: 100 })
		).rejects.toThrow();
		await expect(
			createProduct(ctx, producer.id, { ...answers, brand: { ...brand, color: 'red' } })
		).rejects.toThrow();
		await expect(
			createProduct(ctx, producer.id, { ...answers, templateSlug: 'nope' })
		).rejects.toBeInstanceOf(NotFoundError);
	});
});

describe('editor and ownership (RNF-05)', () => {
	it('hides a product from another producer', async () => {
		const ctx = testCtx();
		const owner = await newUser('p@example.com');
		const other = await newUser('o@example.com');
		const id = await createProduct(ctx, owner.id, answers);
		await expect(getProductEditor(ctx, other.id, id)).rejects.toBeInstanceOf(NotFoundError);
		await expect(addModule(ctx, other.id, id, 'Extra')).rejects.toBeInstanceOf(NotFoundError);
		await expect(publishProduct(ctx, other.id, id)).rejects.toBeInstanceOf(NotFoundError);
	});

	it('appends and reorders modules, refusing an incomplete order', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const id = await createProduct(ctx, producer.id, answers);
		const added = await addModule(ctx, producer.id, id, 'Bônus');
		await addLesson(ctx, producer.id, added, {
			title: 'Receita extra',
			videoUrl: 'https://v.example/1'
		});

		const ids = (await getProductEditor(ctx, producer.id, id)).modules.map((m) => m.id);
		expect(ids.at(-1)).toBe(added);
		await reorderModules(ctx, producer.id, id, [...ids].reverse());
		expect((await getProductEditor(ctx, producer.id, id)).modules[0]!.id).toBe(added);
		await rejectsCode(reorderModules(ctx, producer.id, id, ids.slice(1)), 'invalid_transition');
	});
});

describe('publish (RN-01, RF-15)', () => {
	it('lists the pendencies and refuses to publish until they are solved', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const id = await createProduct(ctx, producer.id, answers);
		for (const m of await db.select().from(module).where(eq(module.productId, id))) {
			await deleteModule(ctx, producer.id, m.id);
		}
		await updatePage(ctx, producer.id, id, 'sales', { sections: [] });

		const editor = await getProductEditor(ctx, producer.id, id);
		expect(editor.pendencies).toEqual(['lesson', 'sales_page']);
		await rejectsCode(publishProduct(ctx, producer.id, id), 'publish_pendencies');
		expect(await db.select().from(lesson)).toHaveLength(0);
	});

	it('publishes once and records the moment', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const id = await createProduct(ctx, producer.id, answers);
		const at = new Date('2026-11-10T12:00:00Z');
		await publishProduct(ctx, producer.id, id, at);
		expect((await getProductEditor(ctx, producer.id, id)).product.publishedAt).toEqual(at);
		await rejectsCode(publishProduct(ctx, producer.id, id), 'invalid_transition');
	});

	it('refuses to publish under an account block (RN-11)', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const support = await newUser('s@example.com', 'support');
		const id = await createProduct(ctx, producer.id, answers);
		await createBlock(ctx, support.id, {
			userId: producer.id,
			target: 'account',
			reason: 'Documento pendente',
			nextStep: 'Envie seu documento'
		});
		await rejectsCode(publishProduct(ctx, producer.id, id), 'blocked');
	});
});

describe('public pages (RF-20)', () => {
	it('shows a published product and hides drafts and blocked products', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const support = await newUser('s@example.com', 'support');
		const draft = await createProduct(ctx, producer.id, answers);
		await expect(getSalesPage(ctx, draft)).rejects.toBeInstanceOf(NotFoundError);

		const { productId, offerId } = await publishedProduct(ctx, producer.id);
		const page = await getSalesPage(ctx, productId);
		expect(page.offers).toHaveLength(1);
		expect((await getCheckout(ctx, offerId)).offer.priceCents).toBe(10_000);

		await createBlock(ctx, support.id, {
			userId: producer.id,
			target: 'product',
			productId,
			reason: 'Denúncia em análise',
			nextStep: 'Aguarde o contato do suporte'
		});
		await expect(getSalesPage(ctx, productId)).rejects.toBeInstanceOf(NotFoundError);
		await expect(getCheckout(ctx, offerId)).rejects.toBeInstanceOf(NotFoundError);
	});

	it('keeps an offer that already has orders', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		await buy(ctx, offerId, 'a@example.com');
		await rejectsCode(deleteOffer(ctx, producer.id, offerId), 'offer_has_orders');
	});
});
