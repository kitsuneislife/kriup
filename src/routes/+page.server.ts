import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ctx } from '#lib/server/app';
import { homeProfile } from '#lib/server/services/profiles';
import { homeRoute } from './(app)/nav';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, resolve('/(public)/login'));
	redirect(303, resolve(homeRoute(await homeProfile(ctx, locals.user))));
};
