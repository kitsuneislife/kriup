// How the editor screens with many forms answer (content, offers): each form names its
// item in the action address (`?/renameModule&id=…`) and every answer says which form it is
// for, so the screen shows an error or a confirmation on the form that sent it.

import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Acted, ActionFailure } from '#lib/server/http';

/** The id in the action address; a missing or malformed one is a 404, like a foreign one. */
export function idOf(url: URL): string {
	const id = z.uuid().safeParse(url.searchParams.get('id'));
	if (!id.success) error(404);
	return id.data;
}

/** The answer for the form `target`: the refusal with what was typed, or that it saved. */
export function answer(result: Acted<unknown>, target: string, typed?: Record<string, string>) {
	if (!result.ok) {
		return fail(result.status, { ...result.data, for: target, typed } satisfies ActionFailure & {
			for: string;
			typed?: Record<string, string>;
		});
	}
	return { for: target, saved: true as const };
}
