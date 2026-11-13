import { fail } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { DomainError } from '#lib/domain/states';
import { issueText } from '#lib/error-text';
import { ctx } from '#lib/server/app';
import { NotFoundError } from '#lib/server/errors';
import { act, formText, requireSupport, type Acted, type ActionFailure } from '#lib/server/http';
import {
	createBlock,
	findBlockTarget,
	liftBlock,
	listActiveBlocks
} from '#lib/server/services/support';
import { blockChoice } from '#lib/support-text';
import type { Actions, PageServerLoad } from './$types';

// RF-61, RN-11. Support finds the person by e-mail (a GET form, `?email=`), then blocks
// their balance or one of their products with a reason and a way out. The forms post to
// an address that keeps `?email=`, so a refusal shows again next to the same person.
export const load: PageServerLoad = async ({ locals, url }) => {
	const viewer = requireSupport(locals);
	const email = url.searchParams.get('email')?.trim() ?? '';
	let person: Awaited<ReturnType<typeof findBlockTarget>> = null;
	let emailError: string | undefined;
	if (email) {
		try {
			person = await findBlockTarget(ctx, viewer, email);
		} catch (err) {
			if (!(err instanceof ZodError)) throw err;
			emailError = issueText(err.issues[0]!);
		}
	}
	return { email, emailError, person, blocks: await listActiveBlocks(ctx, viewer) };
};

/** Every answer says which form it is for, so the error shows on the form that sent it. */
function answer(result: Acted<unknown>, target: string, typed?: Record<string, string>) {
	if (!result.ok) {
		return fail(result.status, { ...result.data, for: target, typed } satisfies ActionFailure & {
			for: string;
			typed?: Record<string, string>;
		});
	}
	return { for: target, saved: true as const };
}

export const actions: Actions = {
	block: async ({ locals, request }) => {
		const supportId = requireSupport(locals).id;
		const form = await request.formData();
		const typed = {
			choice: formText(form, 'choice'),
			reason: formText(form, 'reason'),
			nextStep: formText(form, 'nextStep')
		};
		const result = await act(() =>
			createBlock(ctx, supportId, {
				userId: formText(form, 'userId'),
				...blockChoice(typed.choice),
				reason: typed.reason,
				nextStep: typed.nextStep
			})
		);
		return answer(result, 'block', typed);
	},
	lift: async ({ locals, request }) => {
		const supportId = requireSupport(locals).id;
		const id = formText(await request.formData(), 'blockId');
		// lifted meanwhile (by another tab or person) reads as a change, not as a 404
		const result = await act(() =>
			liftBlock(ctx, supportId, id).catch((err) => {
				if (err instanceof NotFoundError) {
					throw new DomainError('invalid_transition', 'block already lifted');
				}
				throw err;
			})
		);
		return answer(result, `lift:${id}`);
	}
};
