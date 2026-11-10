<script lang="ts">
	import { Button, Cluster, Popover, Stack, Text } from '../index';
</script>

<Cluster gap={4} align="start">
	<Popover label="Filtros">
		{#snippet trigger(props)}
			<Button icon="filter" {...props}>Filtros</Button>
		{/snippet}
		<Stack gap={2}>
			<Text variant="subhead" weight="semibold">Período</Text>
			<Text variant="footnote" tone="secondary">Últimos 30 dias, do primeiro ao último pedido.</Text
			>
		</Stack>
	</Popover>

	<Popover label="Ajuda" align="end">
		{#snippet trigger(props)}
			<Button variant="ghost" icon="help" label="Ajuda" {...props} />
		{/snippet}
		{#snippet children(close)}
			<Stack gap={3}>
				<Text variant="footnote" tone="secondary">
					O valor fica retido até o fim do prazo de garantia.
				</Text>
				<Button size="sm" onclick={() => close()}>Entendi</Button>
			</Stack>
		{/snippet}
	</Popover>
</Cluster>
