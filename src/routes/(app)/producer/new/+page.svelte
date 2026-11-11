<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, EmptyState, Page, Stack, Text } from '#lib/ui';
</script>

<svelte:head><title>Novo produto</title></svelte:head>

<!-- Placeholder until batches 2.2 and 2.3 build the creation assistant. -->
<Page width="text">
	<Stack gap={8}>
		<Text variant="title1" as="h1">Novo produto</Text>
		<EmptyState icon="sparkles" title="O assistente está chegando">
			Em breve você cria o produto por aqui, uma pergunta por vez.
			{#snippet action()}
				<Button icon="arrow-left" href={resolve('/(app)/producer')}>Voltar aos produtos</Button>
			{/snippet}
		</EmptyState>
	</Stack>
</Page>
