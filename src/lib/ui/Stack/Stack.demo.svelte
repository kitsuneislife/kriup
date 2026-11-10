<script lang="ts">
	import { Cluster, Stack, Text } from '../index';

	const gaps = [
		[1, 4],
		[2, 8],
		[3, 12],
		[4, 16],
		[6, 24],
		[8, 32]
	] as const;
</script>

<Stack gap={6}>
	<Text variant="subhead" tone="secondary">
		Pilha vertical. O espaço entre os itens vem da escala, nunca de margem.
	</Text>
	<Cluster gap={8} align="start">
		{#each gaps as [gap, px] (gap)}
			<Stack gap={3} align="center">
				<Stack {gap}>
					{#each [1, 2, 3] as item (item)}<span class="block"></span>{/each}
				</Stack>
				<Stack gap={1} align="center">
					<Text variant="caption" weight="semibold" numeric>gap {gap}</Text>
					<Text variant="caption" tone="secondary" numeric>{px} px</Text>
				</Stack>
			</Stack>
		{/each}
	</Cluster>
</Stack>

<style>
	.block {
		display: block;
		inline-size: var(--control-lg);
		block-size: var(--control-sm);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--indigo) 22%, transparent);
		box-shadow: inset 0 0 0 var(--border-width) color-mix(in srgb, var(--indigo) 45%, transparent);
	}
</style>
