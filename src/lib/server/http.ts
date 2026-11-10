// How routes answer service errors. A form action returns `fail` with a stable code the
// screen turns into text; a missing or foreign resource is a 404; anything else is a bug
// and stays a 500.

import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { DomainError } from '../domain/states';
import type { SessionUser } from './auth/session';
import { NotFoundError } from './errors';

export type ActionFailure = {
	code: string;
	/** Field path to message, for invalid input. */
	fields?: Record<string, string>;
};

/**
 * Runs a service call inside a form action: DomainError and invalid input become a 400
 * with a code, NotFoundError a 404.
 */
export async function act<T>(work: () => Promise<T>) {
	try {
		return { ok: true as const, value: await work() };
	} catch (err) {
		if (err instanceof DomainError) return fail(400, { code: err.code } satisfies ActionFailure);
		if (err instanceof ZodError) {
			const fields = Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message]));
			return fail(400, { code: 'invalid_input', fields } satisfies ActionFailure);
		}
		if (err instanceof NotFoundError) error(404);
		throw err;
	}
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
