import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { getStatement, listStatementProducts } from '#lib/server/services/money';
import { parseStatementQuery, STATEMENT_PAGE_SIZE } from '#lib/statement-filters';
import type { PageServerLoad } from './$types';

// RF-40, RF-43, RF-53, US-04. The statement is the signed-in person's own ledger, so the
// same screen serves a producer and a coproducer without a product, and no id in the URL
// can reach another person's lines. A filter that makes no sense is left out and warned about.
export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const query = parseStatementQuery(url.searchParams);
	const [statement, products] = await Promise.all([
		getStatement(ctx, userId, { ...query.filters, pageSize: STATEMENT_PAGE_SIZE }),
		listStatementProducts(ctx, userId)
	]);
	return {
		entries: statement.entries,
		hasMore: statement.hasMore,
		totalCount: statement.totalCount,
		pageCount: statement.pageCount,
		products,
		values: query.values,
		page: query.filters.page,
		ignored: query.ignored
	};
};
