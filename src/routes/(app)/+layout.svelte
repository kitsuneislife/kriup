<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { NavItem, Shell, Stack, Text } from '#lib/ui';
	import { currentRoute, sections } from './nav';

	let { data, children } = $props();

	const mine = $derived(sections.filter((section) => data.profiles.includes(section.profile)));
	const current = $derived(
		currentRoute(page.route.id, [
			'/(app)/account',
			...mine.flatMap((section) => section.items.map((item) => item.route))
		])
	);
</script>

<Shell>
	{#snippet sidebar()}
		<nav aria-label="Áreas">
			<Stack gap={6}>
				{#each mine as section (section.profile)}
					<Stack gap={1}>
						<Text variant="caption" tone="secondary" weight="semibold">{section.title}</Text>
						{#each section.items as item (item.route)}
							<NavItem href={resolve(item.route)} icon={item.icon} current={current === item.route}>
								{item.label}
							</NavItem>
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
