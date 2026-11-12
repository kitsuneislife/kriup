// How routes answer service errors. A form action returns `fail` with a stable code the
// screen turns into text; a missing or foreign resource is a 404; anything else is a bug
// and stays a 500.

import { error, fail, redirect, type ActionFailure as Failure } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { DomainError } from '../domain/states';
import { issueText, type ErrorCode } from '../error-text';
import type { SessionUser } from './auth/session';
import { NotFoundError } from './errors';

export type ActionFailure = {
	/** The screen shows `errorText(code)`. */
	code: ErrorCode;
	/** Field path to its text, for invalid input. Only the first issue of each field. */
	fields?: Record<string, string>;
};

/** `ok` is absent on a refusal, so `if (!result.ok)` narrows to it. */
export type Acted<T> = { ok: true; value: T } | (Failure<ActionFailure> & { ok?: never });

/**
 * Runs a service call inside a form action: DomainError and invalid input become a 400
 * with a code, NotFoundError a 404.
 */
export async function act<T>(work: () => Promise<T>): Promise<Acted<T>> {
	try {
		return { ok: true as const, value: await work() };
	} catch (err) {
		if (err instanceof DomainError) return fail(400, { code: err.code } satisfies ActionFailure);
		if (err instanceof ZodError) {
			return fail(400, { code: 'invalid_input', fields: fieldErrors(err) } satisfies ActionFailure);
		}
		if (err instanceof NotFoundError) error(404);
		throw err;
	}
}

/** Field path to the text of its first issue, for `ActionFailure.fields`. */
export function fieldErrors(err: ZodError): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const issue of err.issues) fields[issue.path.join('.')] ??= issueText(issue);
	return fields;
}

/** A text field of a submitted form; a missing one (or a file) reads as empty. */
export function formText(form: FormData, key: string): string {
	const value = form.get(key);
	return typeof value === 'string' ? value : '';
}

/** For `load` and API routes: NotFoundError becomes a 404, the rest is rethrown. */
export async function orNotFound<T>(work: Promise<T>): Promise<T> {
	try {
		return await work;
	} catch (err) {
		if (err instanceof NotFoundError || err instanceof ZodError) error(404);
		throw err;
	}
}

/** Pages that need a signed-in user send everyone else to the login. */
export function requireUser(locals: App.Locals): SessionUser {
	if (!locals.user) redirect(303, '/login');
	return locals.user;
}

/** Support pages answer 404 to anyone else, so they do not reveal themselves (RNF-05). */
export function requireSupport(locals: App.Locals): SessionUser {
	if (locals.user?.platformRole !== 'support') error(404);
	return locals.user;
}
