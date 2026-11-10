// Pure display helpers. Money is always integer cents (RNF-01); dates are stored in UTC and
// shown in America/Sao_Paulo (RNF-11).

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/** 123456 -> "R$ 1.234,56" */
export function formatMoney(cents: number): string {
	if (!Number.isSafeInteger(cents)) throw new RangeError(`cents must be a safe integer: ${cents}`);
	return brl.format(cents / 100);
}

/** 123456 -> "1.234,56" (no symbol, for inputs). */
export function formatDecimal(cents: number): string {
	if (!Number.isSafeInteger(cents)) throw new RangeError(`cents must be a safe integer: ${cents}`);
	return decimal.format(cents / 100);
}

/** Keeps the digits the person typed and reads them as cents: "1.234,5" -> 12345. */
export function parseCents(text: string, max = 99_999_999_99): number {
	const digits = text.replace(/\D/g, '').slice(0, 12);
	return Math.min(digits === '' ? 0 : Number(digits), max);
}

export type DateFormat = 'date' | 'datetime' | 'time' | 'relative';

const zone = 'America/Sao_Paulo';
const formats: Record<Exclude<DateFormat, 'relative'>, Intl.DateTimeFormat> = {
	date: new Intl.DateTimeFormat('pt-BR', { timeZone: zone, dateStyle: 'medium' }),
	datetime: new Intl.DateTimeFormat('pt-BR', {
		timeZone: zone,
		dateStyle: 'medium',
		timeStyle: 'short'
	}),
	time: new Intl.DateTimeFormat('pt-BR', { timeZone: zone, timeStyle: 'short' })
};
const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

const steps: [Intl.RelativeTimeFormatUnit, number][] = [
	['day', 86_400_000],
	['hour', 3_600_000],
	['minute', 60_000]
];

export function formatDate(value: Date, format: DateFormat, now = new Date()): string {
	if (format !== 'relative') return formats[format].format(value);
	const diff = value.getTime() - now.getTime();
	for (const [unit, size] of steps) {
		if (Math.abs(diff) >= size) return relative.format(Math.trunc(diff / size), unit);
	}
	return relative.format(0, 'minute');
}
