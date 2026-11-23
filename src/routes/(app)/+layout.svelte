<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Badge, Logo, NavItem, Shell, Stack, Text } from '#lib/ui';
	import { currentRoute, sections } from './nav';

	let { data, children } = $props();

	const mine = $derived(sections.filter((section) => data.profiles.includes(section.profile)));
	const current = $derived(
		currentRoute(page.route.id, [
			'/(app)/account',
			...mine.flatMap((section) => section.items.map((item) => item.route))
		])
	);

	type BadgeSpec = { count: number; tone: 'warning' | 'accent' };

	function badgeFor(route: string): BadgeSpec | undefined {
		switch (route) {
			case '/(app)/producer/refunds':
				return { count: data.counts.producerRefunds, tone: 'warning' };
			case '/(app)/coproductions':
				return { count: data.counts.coproducerInvites, tone: 'accent' };
			case '/(app)/support':
				return { count: data.counts.supportQueue, tone: 'warning' };
			case '/(app)/support/payouts':
				return { count: data.counts.supportPayouts, tone: 'accent' };
			default:
				return undefined;
		}
	}
</script>

<Shell>
	{#snippet brand()}
		<Logo />
	{/snippet}
	{#snippet sidebar()}
		<nav aria-label="Áreas">
			<Stack gap={6}>
				{#each mine as section (section.profile)}
					<Stack gap={1}>
						<Text variant="caption" tone="secondary" weight="semibold">{section.title}</Text>
						{#each section.items as item (item.route)}
							{@const badge = badgeFor(item.route)}
							{#if badge && badge.count > 0}
								<NavItem
									href={resolve(item.route)}
									icon={item.icon}
									current={current === item.route}
								>
									{item.label}
									{#snippet trailing()}
										<Badge tone={badge.tone} size="sm">{badge.count}</Badge>
									{/snippet}
								</NavItem>
							{:else}
								<NavItem
									href={resolve(item.route)}
									icon={item.icon}
									current={current === item.route}
								>
									{item.label}
								</NavItem>
							{/if}
						{/each}
					</Stack>
				{/each}
				<!-- signing out is an action, not a place: it lives on the account page -->
				<Stack gap={1}>
					<Text variant="caption" tone="secondary" weight="semibold">Conta</Text>
					<NavItem
						href={resolve('/(app)/account')}
						icon="user"
						current={current === '/(app)/account'}
					>
						{data.user.name}
					</NavItem>
				</Stack>
			</Stack>
		</nav>
	{/snippet}
	{@render children()}
</Shell>
