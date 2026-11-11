import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { z } from 'zod';
import { dev } from '$app/env';
import { resolve } from '$app/paths';
import { fillDeep } from '#lib/domain/draft';
import { ctx } from '#lib/server/app';
import { act, requireUser, type ActionFailure } from '#lib/server/http';
import { createProduct, listTemplates } from '#lib/server/services/catalog';
import { formatMoney } from '#lib/ui/format';
import { fields, steps, type Answers } from './steps';
import { check, productAnswers, type ProductType } from './wizard';
import type { Actions, PageServerLoad } from './$types';

// The answers wait in a cookie until the last step creates the product, so a reload keeps
// them and the form needs no hidden fields.
const COOKIE = 'product_draft';
const COOKIE_PATH = resolve('/(app)/producer/new');
const last = steps.length - 1;
const savedDraft = z.object({
	userId: z.string(),
	step: z.number().int().min(0).max(last),
	answers: z.partialRecord(z.enum(fields), z.string().max(1_000))
});

function readDraft(cookies: Cookies, userId: string) {
	let saved: z.infer<typeof savedDraft> | undefined;
	try {
		saved = savedDraft.parse(JSON.parse(cookies.get(COOKIE) ?? ''));
	} catch {
		saved = undefined; // no draft yet, or one we cannot read: start over
	}
	// another account signed in on this browser starts its own draft
	return saved?.userId === userId ? saved : { step: 0, answers: {} as Answers };
}

function saveDraft(cookies: Cookies, userId: string, step: number, answers: Answers) {
	cookies.set(COOKIE, JSON.stringify({ userId, step, answers }), {
		path: COOKIE_PATH,
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 24 * 60 * 60
	});
}

/** The step the person is on: the saved one, or an earlier one that is no longer right. */
async function current(locals: App.Locals, cookies: Cookies) {
	const user = requireUser(locals);
	const templates = await listTemplates(ctx);
	const types: ProductType[] = [...new Set(templates.map((t) => t.productType))];
	const draft = readDraft(cookies, user.id);
	const { step } = check(draft.answers, draft.step - 1, types);
	return { user, templates, types, step, answers: draft.answers };
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const { templates, types, step, answers } = await current(locals, cookies);
	if (step < last) return { types, step, answers, previews: [] };

	// RF-11, RF-12: each template of the chosen type, its sales page top filled with the
	// answers and shown in the brand
	const product = productAnswers(answers, types);
	const values = {
		productName: product.name,
		audience: product.audience,
		price: formatMoney(product.priceCents)
	};
	const previews = templates
		.filter((t) => t.productType === product.type)
		.map((t) => {
			const hero = t.structure.pages.sales.sections.find((s) => s.kind === 'hero');
			if (!hero) throw new Error(`template ${t.slug} has no hero section`);
			const { title, subtitle, cta } = fillDeep(hero.fields, values);
			if (!title || !subtitle || !cta) throw new Error(`template ${t.slug} hero is incomplete`);
			return { slug: t.slug, name: t.name, title, subtitle, cta };
		});
	return { types, step, answers, previews, brand: product.brand };
};

export const actions: Actions = {
	next: async ({ locals, cookies, request }) => {
		const { user, types, step, answers } = await current(locals, cookies);
		const form = await request.formData();
		for (const field of steps[step]!.fields) {
			const value = form.get(field);
			answers[field] = typeof value === 'string' ? value : '';
		}
		const checked = check(answers, step, types);
		if (checked.fields) {
			return fail(400, {
				code: 'invalid_input',
				fields: checked.fields,
				answers
			} satisfies ActionFailure & { answers: Answers });
		}
		saveDraft(cookies, user.id, checked.step, answers);
		redirect(303, COOKIE_PATH);
	},
	back: async ({ locals, cookies }) => {
		const { user, step, answers } = await current(locals, cookies);
		saveDraft(cookies, user.id, Math.max(0, step - 1), answers);
		redirect(303, COOKIE_PATH);
	},
	create: async ({ locals, cookies, request }) => {
		const { user, templates, types, step, answers } = await current(locals, cookies);
		// a stale tab whose draft went back to an earlier step: show that step again
		if (step < last) redirect(303, COOKIE_PATH);
		const { type, ...product } = productAnswers(answers, types);
		const slug = (await request.formData()).get('templateSlug');
		// only a template of the chosen type, or the product would change type here
		if (!templates.some((t) => t.slug === slug && t.productType === type)) {
			return fail(400, { code: 'invalid_input' } satisfies ActionFailure);
		}
		const created = await act(() =>
			createProduct(ctx, user.id, { ...product, templateSlug: slug as string })
		);
		if (!created.ok) return created;
		cookies.delete(COOKIE, { path: COOKIE_PATH });
		redirect(303, resolve('/(app)/producer/products/[id]', { id: created.value }));
	}
};
