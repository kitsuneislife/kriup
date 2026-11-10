import { DomainError, type DomainErrorCode } from '../domain/states';

/**
 * The resource does not exist or belongs to someone else. Both answer the same, so an id
 * never reveals that another user's record exists (RNF-05).
 */
export class NotFoundError extends Error {
	override name = 'NotFoundError';
}

export const PG = { CHECK: '23514', UNIQUE: '23505', FOREIGN_KEY: '23503' } as const;

/** Drizzle wraps driver errors; the SQLSTATE and constraint are on the error or its cause. */
export function pgError(err: unknown): { code?: string; constraint?: string } {
	const e = err as { code?: string; constraint_name?: string; cause?: unknown } | null;
	if (e?.code) return { code: e.code, constraint: e.constraint_name };
	const c = e?.cause as { code?: string; constraint_name?: string } | undefined;
	return { code: c?.code, constraint: c?.constraint_name };
}

/**
 * Turns a database rule violation into the DomainError the user can act on; anything
 * else is rethrown, so a real fault still fails loudly.
 */
export async function translate<T>(
	work: Promise<T>,
	rules: { code: string; constraint?: string; error: DomainErrorCode }[]
): Promise<T> {
	try {
		return await work;
	} catch (err) {
		const { code, constraint } = pgError(err);
		const rule = rules.find(
			(r) => r.code === code && (r.constraint === undefined || r.constraint === constraint)
		);
		if (rule) throw new DomainError(rule.error, (err as Error).message);
		throw err;
	}
}

export function assertFound<T>(value: T | undefined | null, what: string): T {
	if (value === undefined || value === null) throw new NotFoundError(`${what} not found`);
	return value;
}
