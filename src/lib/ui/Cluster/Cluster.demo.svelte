<script lang="ts">
	import { Badge, Button, Cluster, Stack, Text } from '../index';
</script>

<Stack gap={6}>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Quebra de linha automática</Text>
		<Cluster gap={2}>
			{#each ['Cursos', 'Mentorias', 'Comunidade', 'Templates', 'Ebooks', 'Assinaturas', 'Eventos'] as item (item)}
				<Badge>{item}</Badge>
			{/each}
		</Cluster>
	</Stack>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Extremos opostos</Text>
		<Cluster justify="between">
			<Text variant="title3">Meus produtos</Text>
			<Button variant="primary" icon="plus">Novo produto</Button>
		</Cluster>
	</Stack>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Alinhado à direita, sem quebra</Text>
		<Cluster justify="end" wrap={false}>
			<Button variant="ghost">Cancelar</Button>
			<Button variant="primary">Salvar</Button>
		</Cluster>
	</Stack>
</Stack>
