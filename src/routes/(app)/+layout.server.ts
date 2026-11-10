import { ctx } from '#lib/server/app';
import { requireUser } from '#lib/server/http';
import { listProfiles } from '#lib/server/services/profiles';
import type { LayoutServerLoad } from './$types';

// Guards the pages of the signed-in area. Form actions skip layout loads, so every action
// still calls requireUser (or requireSupport) itself.
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return { user, profiles: await listProfiles(ctx, user) };
};
