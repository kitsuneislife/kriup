<script lang="ts">
	import type { Component } from 'svelte';
	import { page } from '$app/state';
	import {
		Badge,
		Cluster,
		Divider,
		EmptyState,
		Grid,
		NavItem,
		Page,
		SegmentedControl,
		Shell,
		Showcase,
		Stack,
		Stat,
		Text,
		TextField
	} from '#lib/ui';
	import type { IconName } from '#lib/ui';
	import catalog from '../../../docs/design/catalogo.md?raw';

	// Every <Name>.demo.svelte in the kit shows up here automatically.
	const modules = import.meta.glob<{ default: Component }>('../../lib/ui/*/*.demo.svelte', {
		eager: true
	});

	// Showcase frames every section: this page is its demo.
	const available: ReadonlyMap<string, Component> = new Map(
		Object.entries(modules)
			.map(([path, module]) => [path.split('/').at(-2) ?? path, module.default] as const)
			.filter(([name]) => name !== 'Showcase')
	);

	// "When to use" and "when not to use" come from the catalog table, the single source.
	const usage = new Map(
		catalog
			.split('\n')
			.filter((line) => /^\| `\w+` \|/.test(line))
			.map((line) => {
				const [name = '', use = '', avoid = ''] = line
					.slice(1, -1)
					.split(' | ')
					.map((cell) => cell.trim());
				return [name.replaceAll('`', ''), { use, avoid }] as const;
			})
	);

	// The foundations document a subject, not a component: their text is written here.
	const intros: Record<string, { use: string; avoid: string }> = {
		Swatch: {
			use: 'Paleta de sistema da Apple, padrão claro e escuro. Cada cor tem um só significado; o resto da interface é feito de cinzas.',
			avoid: 'citar `--blue` num componente. Use o papel: `--color-accent`.'
		},
		Text: {
			use: 'Os estilos de texto da Apple com o tracking da tabela SF Pro. A hierarquia vem de tamanho, peso e tom, nunca de cor solta.',
			avoid: 'texto abaixo de 12 px ou tamanho fora da escala.'
		},
		Icon: {
			use: 'Um só conjunto: grade de 24, traço de 1,75 e pontas arredondadas, o peso do SF Symbols ao lado de texto de 15 a 16 px.',
			avoid: 'misturar contorno com preenchido ou colar um SVG solto numa tela.'
		}
	};

	type Item = [name: string, title: string, icon: IconName];
	type Group = { title: string; summary: string; items: Item[] };

	// Order and titles of the page. A demo missing from this list still appears, under "Outros".
	const groups: Group[] = [
		{
			title: 'Fundamentos',
			summary: 'Cor com significado, texto com hierarquia e um único traço de ícone.',
			items: [
				['Swatch', 'Cores', 'sparkles'],
				['Text', 'Tipografia', 'edit'],
				['Icon', 'Ícones', 'star']
			]
		},
		{
			title: 'Layout',
			summary: 'O espaço entre as coisas é do pai. Telas não escrevem CSS de layout.',
			items: [
				['Shell', 'Shell', 'sidebar'],
				['Page', 'Page', 'book'],
				['Stack', 'Stack', 'list'],
				['Cluster', 'Cluster', 'more'],
				['Grid', 'Grid', 'grid'],
				['Divider', 'Divider', 'minus']
			]
		},
		{
			title: 'Ação e entrada',
			summary: 'Um controle para cada tipo de escolha, rótulo sempre visível, resposta ao toque.',
			items: [
				['Button', 'Button', 'play'],
				['TextField', 'TextField', 'edit'],
				['Select', 'Select', 'chevrons-up-down'],
				['Checkbox', 'Checkbox', 'check'],
				['Switch', 'Switch', 'settings'],
				['SegmentedControl', 'SegmentedControl', 'filter'],
				['Field', 'Field', 'link']
			]
		},
		{
			title: 'Feedback',
			summary: 'Nada fica em silêncio: espera tem forma, resultado tem cor e texto.',
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
			summary: 'Superfícies com borda dupla e conteúdo em primeiro lugar.',
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
			summary: 'Onde estou, para onde posso ir, o que dá para fazer aqui.',
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
			summary: 'Números alinhados, tempo em ordem, tendência sem ruído.',
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
			summary: 'Peças do domínio: dinheiro em centavos, datas em Brasília, estados de venda.',
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
		...groups.map((group) => ({
			...group,
			items: group.items.filter(([name]) => available.has(name))
		})),
		...(others.length
			? [
					{
						title: 'Outros',
						summary: 'Demos ainda sem lugar na ordem desta página.',
						items: others.map((name): Item => [name, name, 'package'])
					}
				]
			: [])
	].map((group, index) => ({ ...group, number: String(index + 1).padStart(2, '0') }));

	// ?q= opens the page already filtered, so a link can point at one component
	let query = $state(page.url.searchParams.get('q') ?? '');
	const needle = $derived(query.trim().toLocaleLowerCase('pt-BR'));
	const visible = $derived(
		sections
			.map((group) => ({
				...group,
				items: group.items.filter(([name, title]) =>
					[name, title, group.title, usage.get(name)?.use ?? '']
						.join(' ')
						.toLocaleLowerCase('pt-BR')
						.includes(needle)
				)
			}))
			.filter((group) => group.items.length > 0)
	);

	const total = available.size;

	let theme = $state('system');

	$effect(() => {
		const root = document.documentElement;
		if (theme === 'system') delete root.dataset.theme;
		else root.dataset.theme = theme;
		return () => delete root.dataset.theme;
	});

	// The side navigation follows the scroll: the current section is the last one whose top
	// has passed the upper third of the window. Scroll events are captured from the panel.
	let current = $state('');

	$effect(() => {
		void visible;
		let frame = 0;
		const update = () => {
			frame = 0;
			const line = window.innerHeight / 3;
			let found = '';
			for (const section of document.querySelectorAll<HTMLElement>('main section[id]')) {
				if (section.getBoundingClientRect().top > line) break;
				found = section.id;
			}
			current = found;
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		update();
		document.addEventListener('scroll', schedule, { capture: true, passive: true });
		return () => {
			document.removeEventListener('scroll', schedule, { capture: true });
			cancelAnimationFrame(frame);
		};
	});

	// keep the highlighted item in view inside the sidebar, without moving the page
	$effect(() => {
		if (!current) return;
		document
			.querySelector(`aside a[href="#${current}"]`)
			?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});
</script>

<svelte:head>
	<title>Design kit</title>
</svelte:head>

<Shell>
	{#snippet sidebar()}
		<Stack gap={6}>
			<Stack gap={4}>
				<Cluster justify="between">
					<Text variant="title3" as="strong">Design kit</Text>
					<Badge tone="accent" size="sm">{total}</Badge>
				</Cluster>
				<TextField
					label="Buscar componente"
					labelHidden
					type="search"
					size="sm"
					icon="search"
					placeholder="Buscar"
					bind:value={query}
				/>
			</Stack>
			{#each visible as group (group.title)}
				<Stack gap={1} as="nav">
					<Text variant="caption" tone="tertiary" weight="semibold">{group.title}</Text>
					{#each group.items as [name, title, icon] (name)}
						<NavItem href={`#${name}`} {icon} current={current === name}>{title}</NavItem>
					{/each}
				</Stack>
			{/each}
			<Stack gap={2}>
				<Text variant="caption" tone="tertiary" weight="semibold">Tema</Text>
				<SegmentedControl
					label="Tema"
					size="sm"
					iconOnly
					bind:value={theme}
					options={[
						{ value: 'light', label: 'Claro', icon: 'sun' },
						{ value: 'system', label: 'Auto', icon: 'monitor' },
						{ value: 'dark', label: 'Escuro', icon: 'moon' }
					]}
				/>
			</Stack>
		</Stack>
	{/snippet}

	<Page>
		<Stack gap={24}>
			<!-- while searching, only the results show -->
			{#if !needle}<Stack gap={8}>
					<Stack gap={4}>
						<Text variant="footnote" tone="accent" weight="semibold">Sistema Cakto</Text>
						<Text variant="display" as="h1">Design kit</Text>
						<Text variant="title3" weight="regular" tone="secondary">
							Uma base só para todas as telas. Paleta da Apple com significado, tipografia no estilo
							San Francisco, borda dupla nas superfícies e movimento curto. Tudo aqui funciona no
							claro, no escuro e com contraste aumentado.
						</Text>
					</Stack>
					<Grid min="sm" gap={6}>
						<Stat label="Componentes" icon="package" tone="accent">
							<Text variant="title1" numeric>{total}</Text>
						</Stat>
						<Stat label="Cores com significado" icon="sparkles" tone="pink">
							<Text variant="title1" numeric>12</Text>
						</Stat>
						<Stat label="Estilos de texto" icon="edit" tone="indigo">
							<Text variant="title1" numeric>9</Text>
						</Stat>
						<Stat label="Temas" icon="moon" tone="purple">
							<Text variant="title1" numeric>2</Text>
						</Stat>
					</Grid>
				</Stack>{/if}

			{#each visible as group (group.title)}
				<Stack gap={16}>
					<Stack gap={4}>
						<Divider />
						<Cluster gap={4} align="baseline">
							<Text variant="title3" tone="tertiary" numeric>
								{group.number}
							</Text>
							<Text variant="large" as="h2">{group.title}</Text>
						</Cluster>
						<Text tone="secondary">{group.summary}</Text>
					</Stack>
					{#each group.items as [name, title] (name)}
						{@const Demo = available.get(name)}
						{@const info = intros[name] ?? usage.get(name)}
						{#if Demo}
							<Showcase
								id={name}
								{title}
								{name}
								description={info?.use}
								note={info?.avoid ? `Evite: ${info.avoid}` : undefined}
							>
								<Demo />
							</Showcase>
						{/if}
					{/each}
				</Stack>
			{:else}
				<EmptyState icon="search" title="Nada encontrado">
					Nenhum componente combina com “{query}”. Tente o nome em inglês, como Button.
				</EmptyState>
			{/each}
		</Stack>
	</Page>
</Shell>
