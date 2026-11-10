// CPF or CNPJ of a buyer. Payment providers (Asaas among them) require one to charge;
// it goes to the provider only and is never stored here (RNF-06, collect the minimum).

/** Digits only, or null when the value is not a valid CPF (11) or CNPJ (14). */
export function normalizeTaxId(value: string): string | null {
	const digits = value.replace(/\D/g, '');
	if (digits.length === 11) return isValidCpf(digits) ? digits : null;
	if (digits.length === 14) return isValidCnpj(digits) ? digits : null;
	return null;
}

function isValidCpf(d: string): boolean {
	if (/^(\d)\1{10}$/.test(d)) return false;
	return (
		checkDigit(d, 9, [10, 9, 8, 7, 6, 5, 4, 3, 2]) &&
		checkDigit(d, 10, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
	);
}

function isValidCnpj(d: string): boolean {
	if (/^(\d)\1{13}$/.test(d)) return false;
	return (
		checkDigit(d, 12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
		checkDigit(d, 13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
	);
}

// Mod-11 check digit at `index`, weighting the digits before it.
function checkDigit(d: string, index: number, weights: readonly number[]): boolean {
	const sum = weights.reduce((total, weight, i) => total + Number(d[i]) * weight, 0);
	const rest = sum % 11;
	return Number(d[index]) === (rest < 2 ? 0 : 11 - rest);
}
