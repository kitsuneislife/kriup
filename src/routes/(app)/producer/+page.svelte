<script lang="ts">
	import { EmptyState, Page, Stack, Text } from '#lib/ui';
</script>

<svelte:head><title>Produtos</title></svelte:head>

<!-- Placeholder until batch 2.1 lists the products. -->
<Page>
	<Stack gap={8}>
		<Text variant="title1" as="h1">Produtos</Text>
		<EmptyState icon="package" title="Nenhum produto ainda">
			Em breve você cria o seu primeiro produto por aqui.
		</EmptyState>
	</Stack>
</Page>
