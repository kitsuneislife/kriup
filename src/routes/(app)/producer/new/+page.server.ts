import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { z } from 'zod';
import { dev } from '$app/env';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { requireUser, type ActionFailure } from '#lib/server/http';
import { listTemplates } from '#lib/server/services/catalog';
import { fields, steps, type Answers } from './steps';
import { check, type ProductType } from './wizard';
import type { Actions, PageServerLoad } from './$types';

// The answers wait in a cookie until the last step creates the product (batch 2.3), so a
// reload keeps them and the form needs no hidden fields.
const COOKIE = 'product_draft';
const savedDraft = z.object({
	userId: z.string(),
	step: z
		.number()
		.int()
		.min(0)
		.max(steps.length - 1),
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
		path: resolve('/(app)/producer/new'),
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
	return { user, types, step, answers: draft.answers };
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const { types, step, answers } = await current(locals, cookies);
	return { types, step, answers };
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
		redirect(303, resolve('/(app)/producer/new'));
	},
	back: async ({ locals, cookies }) => {
		const { user, step, answers } = await current(locals, cookies);
		saveDraft(cookies, user.id, Math.max(0, step - 1), answers);
		redirect(303, resolve('/(app)/producer/new'));
	}
};
