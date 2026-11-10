import { error } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { PageServerLoad } from './$types';

// The design kit page is a development tool, never served in production.
export const load: PageServerLoad = () => {
	if (!dev) error(404);
};
