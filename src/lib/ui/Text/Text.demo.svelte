<script lang="ts">
	import { Divider, Grid, Stack, Text } from '../index';

	// variant, name, size / leading, weight, sample
	const styles = [
		['display', 'Display', '48 / 52', 'Bold', 'Vendas do mês'],
		['large', 'Large Title', '34 / 41', 'Bold', 'Painel de dinheiro'],
		['title1', 'Title 1', '28 / 34', 'Semibold', 'Meus produtos'],
		['title2', 'Title 2', '22 / 28', 'Semibold', 'Extrato da semana'],
		['title3', 'Title 3', '20 / 25', 'Semibold', 'Próxima liberação'],
		['body', 'Body', '16 / 23', 'Regular', 'O saldo é liberado depois do prazo de garantia.'],
		['subhead', 'Subhead', '15 / 20', 'Regular', 'Texto de controles, tabelas e listas.'],
		['footnote', 'Footnote', '13 / 18', 'Regular', 'Legendas, ajuda de campos e metadados.'],
		['caption', 'Caption', '12 / 16', 'Regular', 'Rótulos mínimos. Nada abaixo disso.']
	] as const;

	const tones = [
		['primary', 'Primário', 'Conteúdo principal'],
		['secondary', 'Secundário', 'Apoio e descrição'],
		['tertiary', 'Terciário', 'Placeholder, desabilitado'],
		['accent', 'Acento', 'Link e ação'],
		['success', 'Sucesso', 'Liberado, aprovado'],
		['warning', 'Atenção', 'Retido, pendente'],
		['danger', 'Perigo', 'Erro, recusado']
	] as const;
</script>

<Stack gap={12}>
	<Stack gap={4}>
		{#each styles as [variant, name, metrics, weight, sample], index (variant)}
			{#if index > 0}<Divider />{/if}
			<div class="row">
				<Stack gap={1}>
					<Text variant="footnote" weight="semibold">{name}</Text>
					<Text variant="caption" tone="secondary" numeric>{metrics} · {weight}</Text>
				</Stack>
				<Text {variant} truncate>{sample}</Text>
			</div>
		{/each}
	</Stack>

	<Stack gap={4}>
		<Text variant="subhead" weight="semibold">Tons: hierarquia antes da cor</Text>
		<Grid min="sm" gap={6}>
			{#each tones as [tone, name, use] (tone)}
				<Stack gap={1}>
					<Text variant="title3" {tone}>{name}</Text>
					<Text variant="footnote" tone="secondary">{use}</Text>
				</Stack>
			{/each}
		</Grid>
	</Stack>

	<Grid min="lg" gap={8}>
		<Stack gap={3}>
			<Text variant="subhead" weight="semibold">Números tabulares para dinheiro</Text>
			<Stack gap={1}>
				<Text variant="title2" numeric>R$ 1.111,11</Text>
				<Text variant="title2" numeric>R$ 8.888,88</Text>
			</Stack>
			<Text variant="footnote" tone="secondary">
				Os dígitos têm a mesma largura e as colunas se alinham.
			</Text>
		</Stack>
		<Stack gap={3}>
			<Text variant="subhead" weight="semibold">Corte com reticências</Text>
			<Text variant="subhead" truncate>
				Texto longo que não cabe na linha corta com reticências no final da linha atual do
				componente.
			</Text>
		</Stack>
	</Grid>
</Stack>

<style>
	/* specimen sheet: a narrow column of metrics, the sample takes the rest */
	.row {
		display: grid;
		grid-template-columns: var(--width-column-sm) minmax(0, 1fr);
		align-items: center;
		gap: var(--space-6);
	}
	@media (max-width: 40rem) {
		.row {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-2);
		}
	}
</style>
