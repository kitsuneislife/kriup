<script lang="ts">
	import { EmptyState, Page, Stack, Text } from '#lib/ui';
</script>

<svelte:head><title>Meus cursos</title></svelte:head>

<!-- Placeholder until batch 4.1 lists the products with progress. -->
<Page>
	<Stack gap={8}>
		<Text variant="title1" as="h1">Meus cursos</Text>
		<EmptyState icon="book" title="Seus cursos aparecem aqui">
			Em breve você assiste às aulas e acompanha o seu progresso por aqui.
		</EmptyState>
	</Stack>
</Page>
