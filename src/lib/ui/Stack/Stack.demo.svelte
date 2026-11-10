<script lang="ts">
	import { Cluster, Stack, Swatch, Text } from '../index';

	const gaps = [1, 2, 3, 4, 6, 8] as const;
</script>

<Stack gap={6}>
	<Text variant="subhead" tone="secondary">
		Pilha vertical. O espaço entre os itens vem da escala de espaçamento, nunca de margem.
	</Text>
	<Cluster gap={8} align="start">
		{#each gaps as gap (gap)}
			<Stack gap={3} align="start">
				<Text variant="caption" tone="secondary" numeric>gap {gap}</Text>
				<Stack {gap}>
					<Swatch token="--indigo" />
					<Swatch token="--indigo" />
					<Swatch token="--indigo" />
				</Stack>
			</Stack>
		{/each}
	</Cluster>
</Stack>
