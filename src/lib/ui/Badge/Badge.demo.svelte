<script lang="ts">
	import { Badge, Cluster, Stack, Text, type Tone } from '../index';

	const tones: Tone[] = [
		'neutral',
		'accent',
		'success',
		'warning',
		'danger',
		'indigo',
		'purple',
		'pink',
		'teal',
		'mint',
		'cyan',
		'brown',
		'yellow'
	];
</script>

<Stack gap={6}>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Tons</Text>
		<Cluster gap={2}>
			{#each tones as tone (tone)}
				<Badge {tone}>{tone}</Badge>
			{/each}
		</Cluster>
	</Stack>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium"
			>Status com ponto e tamanho pequeno</Text
		>
		<Cluster gap={2}>
			<Badge tone="warning" dot>Retido</Badge>
			<Badge tone="success" dot>Liberado</Badge>
			<Badge tone="accent" dot>Sacado</Badge>
			<Badge tone="danger" dot>Recusado</Badge>
			<Badge tone="indigo" dot size="sm">Reembolso</Badge>
			<Badge tone="purple" dot size="sm">Coprodução</Badge>
		</Cluster>
	</Stack>
</Stack>
