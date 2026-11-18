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
		items: [
			{ route: '/(app)/producer', label: 'Produtos', icon: 'package' },
			{ route: '/(app)/producer/money', label: 'Dinheiro', icon: 'wallet' },
			{ route: '/(app)/producer/refunds', label: 'Reembolsos', icon: 'refresh' }
		]
	},
	{
		profile: 'student',
		title: 'Aluno',
		items: [
			{ route: '/(app)/student', label: 'Meus cursos', icon: 'book' },
			{ route: '/(app)/student/orders', label: 'Pedidos', icon: 'receipt' },
			{ route: '/(app)/student/tickets', label: 'Chamados', icon: 'message' }
		]
	},
	{
		profile: 'coproducer',
		title: 'Coprodução',
		items: [
			{ route: '/(app)/coproductions', label: 'Convites', icon: 'users' },
			{ route: '/(app)/producer/money/statement', label: 'Extrato', icon: 'receipt' }
		]
	},
	{
		profile: 'support',
		title: 'Suporte',
		items: [
			{ route: '/(app)/support', label: 'Fila', icon: 'shield' },
			{ route: '/(app)/support/metrics', label: 'Métricas', icon: 'trending' },
			{ route: '/(app)/support/payouts', label: 'Saques', icon: 'wallet' },
			{ route: '/(app)/support/blocks', label: 'Bloqueios', icon: 'lock' },
			{ route: '/(app)/support/audit', label: 'Auditoria', icon: 'list' }
		]
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
