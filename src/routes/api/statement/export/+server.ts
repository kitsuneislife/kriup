import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { getStatement } from '#lib/server/services/money';
import { entryStateText, entryTypeText, parseStatementQuery } from '#lib/statement-filters';
import { formatDecimal } from '#lib/ui';
import type { RequestHandler } from './$types';

const saoPauloDate = new Intl.DateTimeFormat('pt-BR', {
	timeZone: 'America/Sao_Paulo',
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
});

function csvQuote(value: string): string {
	return /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Prefixes leading formula triggers on text cells before RFC 4180 quoting. */
function csvText(value: string): string {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return csvQuote(safe);
}

// RF-43: exports the signed-in user's filtered statement as a UTF-8 BOM CSV for spreadsheets.
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireUser(locals);
	const { filters } = parseStatementQuery(url.searchParams);
	const { entries } = await getStatement(ctx, user.id, {
		...filters,
		page: 1,
		pageSize: 1_000
	});

	const header = 'Data;Produto;Tipo;Regra aplicada;Estado;Valor (R$)';
	const lines = entries.map((row) =>
		[
			csvQuote(saoPauloDate.format(row.createdAt)),
			csvText(row.productName ?? ''),
			csvText(entryTypeText[row.type]),
			csvText(row.reason),
			csvText(entryStateText[row.state].label),
			csvQuote(formatDecimal(row.amountCents))
		].join(';')
	);
	const csv = `\uFEFF${[header, ...lines].join('\r\n')}`;

	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="extrato-kriup.csv"',
			'cache-control': 'no-store'
		}
	});
};
