<script lang="ts">
	import { Card, Grid, Stack, Text } from '../index';
</script>

<Stack gap={6}>
	<Text variant="subhead" tone="secondary">
		Colunas se ajustam à largura disponível. Redimensione a janela: sem ponto de quebra escrito à
		mão.
	</Text>
	<Grid min="sm" gap={4}>
		{#each ['Retido', 'Liberado', 'Sacado'] as label (label)}
			<Card>
				<Stack gap={1}>
					<Text variant="footnote" tone="secondary">{label}</Text>
					<Text variant="title1" numeric>R$ 1.240,00</Text>
				</Stack>
			</Card>
		{/each}
	</Grid>
</Stack>
