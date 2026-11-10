<script lang="ts">
	import { EmptyState, Page, Stack, Text } from '#lib/ui';
</script>

<svelte:head><title>Convites de coprodução</title></svelte:head>

<!-- Placeholder until batch 7.2 lists the invites and contracts. -->
<Page>
	<Stack gap={8}>
		<Text variant="title1" as="h1">Convites de coprodução</Text>
		<EmptyState icon="users" title="Seus convites aparecem aqui">
			Em breve você lê o contrato e aceita cada convite por aqui.
		</EmptyState>
	</Stack>
</Page>
