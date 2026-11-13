// The statement filters as they travel in the URL (RF-43), and the text of each ledger
// state and entry type. Safe on the client.

import { z } from 'zod';
import type { EntryState } from './domain/states';
import type { Status } from './ui';

/** The StatusBadge of each ledger state (docs/design/cores.md). */
export const entryStateText: Record<EntryState, { status: Status; label: string }> = {
	held: { status: 'retido', label: 'Retido' },
	released: { status: 'liberado', label: 'Liberado' },
	paid_out: { status: 'sacado', label: 'Sacado' },
	reversed: { status: 'estornado', label: 'Estornado' }
};

export const entryTypeText = {
	sale: 'Venda',
	reversal: 'Estorno',
	payout: 'Saque',
	payout_fee: 'Taxa de saque',
	adjustment: 'Ajuste'
} as const;

export const STATEMENT_PAGE_SIZE = 20;

/** America/Sao_Paulo has no daylight saving time since 2019 (RNF-11). */
const OFFSET_HOURS = 3;
const dayText = /^\d{4}-\d{2}-\d{2}$/;

/** The start of a calendar day in Sao Paulo, or undefined for text that is not a real date. */
function startOfDay(text: string): Date | undefined {
	if (!dayText.test(text)) return undefined;
	const date = new Date(`${text}T00:00:00Z`);
	// 2026-02-31 rolls over to March: the round trip tells a real day from an impossible one
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return undefined;
	return new Date(date.getTime() + OFFSET_HOURS * 3_600_000);
}

export type StatementQuery = {
	/** What goes back into the form fields: only the values that were understood. */
	values: { product: string; state: string; from: string; to: string };
	/** What goes to `getStatement`. `to` is exclusive: the end of the chosen day. */
	filters: { productId?: string; state?: EntryState; from?: Date; to?: Date; page: number };
	/** True when something in the URL was not understood and was left out. */
	ignored: boolean;
};

/**
 * Reads the filters from the query string. A value that does not make sense is dropped
 * instead of failing the page, and `ignored` says so; the screen warns about it.
 */
export function parseStatementQuery(
	params: URLSearchParams,
	states: readonly string[] = Object.keys(entryStateText)
): StatementQuery {
	let ignored = false;
	const read = (key: string) => params.get(key)?.trim() ?? '';
	const keep = (key: string, ok: (value: string) => boolean): string | undefined => {
		const value = read(key);
		if (value === '') return undefined;
		if (ok(value)) return value;
		ignored = true;
		return undefined;
	};

	const product = keep('product', (v) => z.uuid().safeParse(v).success);
	const state = keep('state', (v) => states.includes(v)) as EntryState | undefined;
	let from = keep('from', (v) => startOfDay(v) !== undefined);
	let to = keep('to', (v) => startOfDay(v) !== undefined);
	if (from && to && from > to) {
		ignored = true;
		from = to = undefined;
	}
	const rawPage = read('page');
	const page = /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
	if (rawPage !== '' && String(page) !== rawPage) ignored = true;

	return {
		values: { product: product ?? '', state: state ?? '', from: from ?? '', to: to ?? '' },
		filters: {
			productId: product,
			state,
			from: from ? startOfDay(from) : undefined,
			to: to ? new Date(startOfDay(to)!.getTime() + 86_400_000) : undefined,
			page
		},
		ignored
	};
}
