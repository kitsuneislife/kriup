// Integer-cent arithmetic (RNF-01) and time helpers shared by the domain.

export const BP_SCALE = 10_000;
export const DAY_MS = 86_400_000;

/** Largest amount whose basis-point products stay exact (about R$ 9 billion). */
export const MAX_CENTS = Math.floor((Number.MAX_SAFE_INTEGER - BP_SCALE) / BP_SCALE);

export function assertCents(name: string, value: number): void {
	if (!Number.isInteger(value) || value < 0 || value > MAX_CENTS) {
		throw new RangeError(`${name} must be an integer number of cents between 0 and ${MAX_CENTS}`);
	}
}

/** Like assertCents, but allows negative values (balances, signed ledger amounts). */
export function assertSignedCents(name: string, value: number): void {
	if (!Number.isInteger(value) || Math.abs(value) > MAX_CENTS) {
		throw new RangeError(`${name} must be an integer number of cents up to ±${MAX_CENTS}`);
	}
}

export function assertBp(name: string, value: number): void {
	if (!Number.isInteger(value) || value < 0 || value > BP_SCALE) {
		throw new RangeError(`${name} must be an integer between 0 and ${BP_SCALE} basis points`);
	}
}

export function assertDate(name: string, value: Date): void {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw new RangeError(`${name} must be a valid Date`);
	}
}

// x is an exact non-negative integer; `x / BP_SCALE` in floating point can round up near
// an integer for large x, so subtract the remainder first and divide an exact multiple.
function divideByScale(x: number): number {
	return (x - (x % BP_SCALE)) / BP_SCALE;
}

/** `bp` basis points of `cents`, rounded down to the cent. */
export function shareDown(cents: number, bp: number): number {
	return divideByScale(cents * bp);
}

/** `bp` basis points of `cents`, rounded to the nearest cent, half up. */
export function shareHalfUp(cents: number, bp: number): number {
	return divideByScale(cents * bp + BP_SCALE / 2);
}

/** Calendar days as exact 24 h periods: instants are UTC (RNF-11) and Brazil has no DST. */
export function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * DAY_MS);
}
