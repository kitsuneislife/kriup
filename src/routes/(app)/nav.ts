// The sidebar of the signed-in area: one section per profile (RF-04). Each batch of the
// frontend plan adds its screens here.

import type { PageRouteId } from '$app/types';
import type { Profile } from '#lib/server/services/profiles';
import type { IconName } from '#lib/ui';

/** A route without parameters, so `resolve(route)` needs nothing else. */
type PlainRoute = Exclude<PageRouteId, `${string}[${string}`>;

/** `route` is a route id, so `resolve` checks it and it matches `page.route.id`. */
export type NavItem = { route: PlainRoute; label: string; icon: IconName };

export const sections: { profile: Profile; title: string; items: NavItem[] }[] = [
	{
		profile: 'producer',
		title: 'Produtor',
		items: [{ route: '/(app)/producer', label: 'Produtos', icon: 'package' }]
	},
	{
		profile: 'student',
		title: 'Aluno',
		items: [{ route: '/(app)/student', label: 'Meus cursos', icon: 'book' }]
	},
	{
		profile: 'coproducer',
		title: 'Coprodução',
		items: [{ route: '/(app)/coproductions', label: 'Convites', icon: 'users' }]
	},
	{
		profile: 'support',
		title: 'Suporte',
		items: [{ route: '/(app)/support', label: 'Fila', icon: 'shield' }]
	}
];

/** The first screen of a profile's section, where `/` sends the person (`homeProfile`). */
export function homeRoute(profile: Profile): PlainRoute {
	const section = sections.find((s) => s.profile === profile);
	if (!section?.items[0]) throw new Error(`no section for profile ${profile}`);
	return section.items[0].route;
}

/** The item to mark: the longest route that is the page's own route or one of its parents. */
export function currentRoute(routeId: string | null, routes: readonly string[]) {
	if (routeId === null) return undefined;
	return routes
		.filter((route) => routeId === route || routeId.startsWith(`${route}/`))
		.reduce<string | undefined>(
			(best, route) => (route.length > (best?.length ?? -1) ? route : best),
			undefined
		);
}
