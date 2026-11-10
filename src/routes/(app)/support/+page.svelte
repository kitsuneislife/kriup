<script lang="ts">
	import { EmptyState, Page, Stack, Text } from '#lib/ui';
</script>

<svelte:head><title>Fila do suporte</title></svelte:head>

<!-- Placeholder until batch 8.1 shows the queue. -->
<Page>
	<Stack gap={8}>
		<Text variant="title1" as="h1">Fila do suporte</Text>
		<EmptyState icon="shield" title="A fila aparece aqui">
			Em breve os reembolsos escalados e os chamados chegam por aqui, ordenados pelo prazo.
		</EmptyState>
	</Stack>
</Page>
