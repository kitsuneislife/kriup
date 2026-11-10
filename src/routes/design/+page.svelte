<script lang="ts">
	import type { Component } from 'svelte';
	import { Card, NavItem, Page, SegmentedControl, Shell, Stack, Text } from '#lib/ui';
	import type { IconName } from '#lib/ui';

	// Every <Name>.demo.svelte in the kit shows up here automatically.
	const modules = import.meta.glob<{ default: Component }>('../../lib/ui/*/*.demo.svelte', {
		eager: true
	});

	const available = new Map(
		Object.entries(modules).map(([path, module]) => [
			path.split('/').at(-2) ?? path,
			module.default
		])
	);

	// Order and titles of the page. A demo missing from this list still appears, under "Outros".
	const groups: { title: string; items: [name: string, title: string, icon: IconName][] }[] = [
		{
			title: 'Fundamentos',
			items: [
				['Swatch', 'Cores', 'sparkles'],
				['Text', 'Tipografia', 'edit'],
				['Icon', 'Ícones', 'star']
			]
		},
		{
			title: 'Layout',
			items: [
				['Shell', 'Shell', 'sidebar'],
				['Page', 'Page', 'book'],
				['Stack', 'Stack', 'list'],
				['Cluster', 'Cluster', 'more'],
				['Grid', 'Grid', 'grid'],
				['Divider', 'Divider', 'chevrons-up-down']
			]
		},
		{
			title: 'Ação e entrada',
			items: [
				['Button', 'Button', 'play'],
				['TextField', 'TextField', 'edit'],
				['Select', 'Select', 'chevron-down'],
				['Checkbox', 'Checkbox', 'check'],
				['Switch', 'Switch', 'settings'],
				['SegmentedControl', 'SegmentedControl', 'filter'],
				['Field', 'Field', 'link']
			]
		},
		{
			title: 'Feedback',
			items: [
				['Alert', 'Alert', 'info'],
				['Progress', 'Progress', 'trending'],
				['Spinner', 'Spinner', 'refresh'],
				['Skeleton', 'Skeleton', 'clock'],
				['Badge', 'Badge', 'shield'],
				['Dialog', 'Dialog', 'x-circle']
			]
		},
		{
			title: 'Conteúdo',
			items: [
				['Card', 'Card', 'card'],
				['Avatar', 'Avatar', 'user'],
				['NavItem', 'NavItem', 'home'],
				['Disclosure', 'Disclosure', 'chevron-down'],
				['EmptyState', 'EmptyState', 'folder'],
				['Message', 'Message', 'message']
			]
		},
		{
			title: 'Navegação',
			items: [
				['Tabs', 'Tabs', 'list'],
				['Breadcrumb', 'Breadcrumb', 'chevron-right'],
				['Pagination', 'Pagination', 'arrow-right'],
				['Stepper', 'Stepper', 'check-circle'],
				['Menu', 'Menu', 'more'],
				['Popover', 'Popover', 'info'],
				['Tooltip', 'Tooltip', 'help'],
				['Toast', 'Toast', 'bell']
			]
		},
		{
			title: 'Dados',
			items: [
				['Table', 'Table', 'grid'],
				['Timeline', 'Timeline', 'clock'],
				['Checklist', 'Checklist', 'check'],
				['Chart', 'Chart', 'trending'],
				['LessonList', 'LessonList', 'book'],
				['VideoFrame', 'VideoFrame', 'play']
			]
		},
		{
			title: 'Do sistema',
			items: [
				['Money', 'Money', 'wallet'],
				['DateTime', 'DateTime', 'calendar'],
				['Stat', 'Stat', 'receipt'],
				['StatusBadge', 'StatusBadge', 'shield'],
				['FileUpload', 'FileUpload', 'upload'],
				['ColorField', 'ColorField', 'image'],
				['CopyField', 'CopyField', 'copy']
			]
		}
	];

	const listed = new Set(groups.flatMap((group) => group.items.map(([name]) => name)));
	const others = [...available.keys()].filter((name) => !listed.has(name)).sort();
	const sections = [
		...groups,
		...(others.length
			? [
					{
						title: 'Outros',
						items: others.map((name): [string, string, IconName] => [name, name, 'package'])
					}
				]
			: [])
	];

	let theme = $state('system');

	$effect(() => {
		const root = document.documentElement;
		if (theme === 'system') delete root.dataset.theme;
		else root.dataset.theme = theme;
		return () => delete root.dataset.theme;
	});
</script>

<svelte:head>
	<title>Design kit</title>
</svelte:head>

<Shell>
	{#snippet sidebar()}
		<Stack gap={6}>
			<Stack gap={3}>
				<Text variant="title3">Design kit</Text>
				<SegmentedControl
					label="Tema"
					size="sm"
					iconOnly
					bind:value={theme}
					options={[
						{ value: 'light', label: 'Claro', icon: 'sun' },
						{ value: 'system', label: 'Sistema', icon: 'monitor' },
						{ value: 'dark', label: 'Escuro', icon: 'moon' }
					]}
				/>
			</Stack>
			{#each sections as group (group.title)}
				<Stack gap={1} as="nav">
					<Text variant="caption" tone="tertiary" weight="medium">{group.title}</Text>
					{#each group.items as [name, title, icon] (name)}
						{#if available.has(name)}
							<NavItem href={`#${name}`} {icon}>{title}</NavItem>
						{/if}
					{/each}
				</Stack>
			{/each}
		</Stack>
	{/snippet}

	<Page>
		<Stack gap={12}>
			<Stack gap={2}>
				<Text variant="large" as="h1">Design kit</Text>
				<Text tone="secondary">
					Base visual do sistema: paleta Apple, tipografia no estilo San Francisco, superfícies com
					borda dupla e movimento curto. Cada peça abaixo mostra todas as variantes e estados, nos
					dois temas.
				</Text>
			</Stack>

			{#each sections as group (group.title)}
				{#each group.items as [name, title] (name)}
					{@const Demo = available.get(name)}
					{#if Demo}
						<section id={name}>
							<Stack gap={4}>
								<Text variant="title2" as="h2">{title}</Text>
								<Card variant="frame" padding="lg">
									{#snippet header()}{name}{/snippet}
									<Demo />
								</Card>
							</Stack>
						</section>
					{/if}
				{/each}
			{/each}
		</Stack>
	</Page>
</Shell>
