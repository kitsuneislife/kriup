<script lang="ts">
	import { Card, Page, Stack, Text } from '../index';
</script>

<Card padding="none">
	<Page width="text">
		<Stack gap={2}>
			<Text variant="title2" as="h3">Largura de texto</Text>
			<Text tone="secondary">
				A página limita a largura do conteúdo (texto 680 px, página 1120 px) e centraliza sem usar
				margem. A entrada do conteúdo faz esmaecer e subir de leve.
			</Text>
		</Stack>
	</Page>
</Card>
