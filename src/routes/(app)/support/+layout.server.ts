import { requireSupport } from '#lib/server/http';
import type { LayoutServerLoad } from './$types';

// Anyone else gets a 404, as if the area did not exist (RNF-05). Actions check it again.
export const load: LayoutServerLoad = ({ locals }) => {
	requireSupport(locals);
};
