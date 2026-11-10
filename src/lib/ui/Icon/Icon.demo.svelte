<script lang="ts">
	import { Grid, Icon, Stack, Text } from '../index';
	import { icons, type IconName } from './icons';

	const names = Object.keys(icons) as IconName[];
</script>

<Stack gap={6}>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Tamanhos: 16, 20, 24</Text>
		<Stack gap={3} align="start">
			<Icon name="wallet" size="sm" />
			<Icon name="wallet" size="md" />
			<Icon name="wallet" size="lg" />
		</Stack>
	</Stack>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Conjunto ({names.length})</Text>
		<Grid min="sm" gap={3}>
			{#each names as name (name)}
				<Stack gap={2} align="start">
					<Icon {name} size="lg" />
					<Text variant="caption" tone="secondary">{name}</Text>
				</Stack>
			{/each}
		</Grid>
	</Stack>
</Stack>
