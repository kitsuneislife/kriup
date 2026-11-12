import { ctx } from '#lib/server/app';
import { orNotFound } from '#lib/server/http';
import { getSalesPage } from '#lib/server/services/catalog';
import type { PageServerLoad } from './$types';

// RF-20: public. A draft, a blocked product or a malformed id answers 404, the same as a
// product that does not exist.
export const load: PageServerLoad = async ({ params }) => {
	const { product, page, offers } = await orNotFound(getSalesPage(ctx, params.id));
	return { product, sections: page.sections, offers };
};
