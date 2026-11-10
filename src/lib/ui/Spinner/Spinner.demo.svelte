<script lang="ts">
	import { Cluster, Spinner, Text, Stack } from '../index';
</script>

<Stack gap={3}>
	<Text variant="footnote" tone="secondary" weight="medium">
		Aparece depois de 150 ms: respostas rápidas não piscam
	</Text>
	<Cluster gap={4}>
		<Spinner size="sm" label="Carregando" />
		<Spinner size="md" label="Carregando" />
		<Spinner size="lg" label="Carregando" />
	</Cluster>
</Stack>
