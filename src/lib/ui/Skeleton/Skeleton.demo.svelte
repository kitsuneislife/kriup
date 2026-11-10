<script lang="ts">
	import { Card, Cluster, Skeleton, Stack, Text } from '../index';
</script>

<Stack gap={6}>
	<Text variant="subhead" tone="secondary">
		Esqueleto com o formato do conteúdo final, para a tela não ficar vazia nem pular.
	</Text>
	<Card>
		<Cluster gap={4} align="start" wrap={false}>
			<Skeleton shape="circle" size="lg" />
			<Stack gap={3}>
				<Skeleton lines={3} />
			</Stack>
		</Cluster>
	</Card>
	<Skeleton shape="block" size="md" />
</Stack>
