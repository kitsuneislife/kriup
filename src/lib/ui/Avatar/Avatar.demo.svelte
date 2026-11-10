<script lang="ts">
	import { Avatar, Cluster, Stack, Text } from '../index';

	const names = [
		'Joaquim Neto',
		'Maria Souza',
		'Ana Paula',
		'Carlos Lima',
		'Bia Torres',
		'Davi Rocha'
	];
</script>

<Stack gap={6}>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Tamanhos (32, 40, 48)</Text>
		<Cluster gap={3}>
			<Avatar name="Joaquim Neto" size="sm" />
			<Avatar name="Joaquim Neto" size="md" />
			<Avatar name="Joaquim Neto" size="lg" />
		</Cluster>
	</Stack>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium"
			>A cor sai do nome: o mesmo nome tem sempre a mesma cor</Text
		>
		<Cluster gap={3}>
			{#each names as name (name)}
				<Avatar {name} />
			{/each}
		</Cluster>
	</Stack>
</Stack>
