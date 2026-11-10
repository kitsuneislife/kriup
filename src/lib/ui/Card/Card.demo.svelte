<script lang="ts">
	import { Badge, Card, Cluster, Grid, Stack, Text } from '../index';
</script>

<Stack gap={8}>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Plain: uma superfície</Text>
		<Grid min="md" gap={4}>
			<Card>
				<Stack gap={1}>
					<Text variant="footnote" tone="secondary">Saldo liberado</Text>
					<Text variant="title1" numeric>R$ 4.320,00</Text>
				</Stack>
			</Card>
			<Card href="#Card">
				<Stack gap={1}>
					<Text variant="footnote" tone="secondary">Card como link</Text>
					<Text variant="title3">Hover e clique</Text>
				</Stack>
			</Card>
			<Card selected>
				<Stack gap={1}>
					<Text variant="footnote" tone="secondary">Selecionado</Text>
					<Text variant="title3">Borda de acento</Text>
				</Stack>
			</Card>
		</Grid>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">
			Frame: borda dupla, com cantos concêntricos (raio interno = externo − 4)
		</Text>
		<Grid min="md" gap={4}>
			<Card variant="frame">
				{#snippet header()}Assistente de criação{/snippet}
				<Stack gap={2}>
					<Text variant="title3">Curso de fotografia</Text>
					<Text variant="subhead" tone="secondary">Passo 2 de 5</Text>
				</Stack>
			</Card>
			<Card variant="frame" selected>
				{#snippet header()}
					<Cluster justify="between">
						<span>Modelo</span>
						<Badge tone="accent" size="sm">Escolhido</Badge>
					</Cluster>
				{/snippet}
				<Stack gap={2}>
					<Text variant="title3">Página de venda</Text>
					<Text variant="subhead" tone="secondary">Com a marca do produtor</Text>
				</Stack>
			</Card>
			<Card variant="frame" href="#Card">
				{#snippet header()}Link{/snippet}
				<Text variant="title3">Frame clicável</Text>
			</Card>
		</Grid>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Espaçamento interno</Text>
		<Grid min="sm" gap={4}>
			{#each ['none', 'sm', 'md', 'lg'] as const as padding (padding)}
				<Card {padding}><Text variant="footnote">padding {padding}</Text></Card>
			{/each}
		</Grid>
	</Stack>
</Stack>
