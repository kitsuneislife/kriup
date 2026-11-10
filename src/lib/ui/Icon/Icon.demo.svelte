<script lang="ts">
	import { Cluster, Icon, Stack, Text } from '../index';
	import { icons, type IconName } from './icons';

	const names = Object.keys(icons) as IconName[];
	const sizes = [
		['sm', '16', 'Footnote, botão pequeno'],
		['md', '20', 'Body, item de menu'],
		['lg', '24', 'Título, estado vazio']
	] as const;
</script>

<Stack gap={12}>
	<Stack gap={4}>
		<Text variant="subhead" weight="semibold">Tamanhos atrelados ao texto</Text>
		<Cluster gap={12} align="end">
			{#each sizes as [size, px, use] (size)}
				<Stack gap={3}>
					<Cluster gap={2} align="center">
						<Icon name="wallet" {size} />
						<Text variant={size === 'sm' ? 'footnote' : size === 'md' ? 'body' : 'title3'}>
							Saldo
						</Text>
					</Cluster>
					<Stack gap={1}>
						<Text variant="caption" weight="semibold" numeric>{size} · {px} px</Text>
						<Text variant="caption" tone="secondary">{use}</Text>
					</Stack>
				</Stack>
			{/each}
		</Cluster>
	</Stack>

	<Stack gap={4}>
		<Text variant="subhead" weight="semibold">Conjunto · {names.length} ícones</Text>
		<ul class="set">
			{#each names as name (name)}
				<li class="tile" title={name}>
					<Icon {name} size="lg" />
					<span class="name">{name}</span>
				</li>
			{/each}
		</ul>
	</Stack>
</Stack>

<style>
	/* a sheet of tiles like the SF Symbols app: the icon centered, the name under it */
	.set {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(calc(var(--control-lg) * 2), 1fr));
		gap: var(--space-2);
	}
	.tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		aspect-ratio: 1;
		padding: var(--space-2);
		border-radius: var(--radius-md);
		background: var(--color-bg-raised);
		box-shadow:
			0 0 0 var(--border-width) var(--color-border),
			inset 0 1px 0 var(--color-highlight);
		color: var(--color-text);
		transition:
			transform var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard);
	}
	.tile:hover {
		color: var(--color-accent);
		transform: translateY(calc(var(--shift) / -4));
	}
	.name {
		max-inline-size: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		color: var(--color-text-secondary);
	}
</style>
