<script lang="ts">
	import { Stack, Text } from '../index';

	const styles = [
		['display', 'Display 48', 'Vendas do mês'],
		['large', 'Large title 34', 'Painel de dinheiro'],
		['title1', 'Title 1 · 28', 'Meus produtos'],
		['title2', 'Title 2 · 22', 'Extrato da semana'],
		['title3', 'Title 3 · 20', 'Próxima liberação'],
		['body', 'Body · 16', 'O saldo é liberado depois do prazo de garantia.'],
		['subhead', 'Subhead · 15', 'Texto de controles, tabelas e listas.'],
		['footnote', 'Footnote · 13', 'Legendas, ajuda de campos e metadados.'],
		['caption', 'Caption · 12', 'Rótulos mínimos. Nada abaixo disso.']
	] as const;
</script>

<Stack gap={8}>
	<Stack gap={4}>
		{#each styles as [variant, name, sample] (variant)}
			<Stack gap={1}>
				<Text variant="caption" tone="tertiary" numeric>{name}</Text>
				<Text {variant}>{sample}</Text>
			</Stack>
		{/each}
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium"
			>Tons de texto (hierarquia por cor)</Text
		>
		<Text>Primário: conteúdo principal</Text>
		<Text tone="secondary">Secundário: apoio e descrição</Text>
		<Text tone="tertiary">Terciário: placeholder e desabilitado</Text>
		<Text tone="accent">Acento: link e ação</Text>
		<Text tone="success">Sucesso: liberado, aprovado</Text>
		<Text tone="warning">Atenção: retido, pendente</Text>
		<Text tone="danger">Perigo: erro, recusado</Text>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Números tabulares, para dinheiro</Text
		>
		<Text variant="title2" numeric>R$ 1.111,11</Text>
		<Text variant="title2" numeric>R$ 8.888,88</Text>
		<Text variant="subhead" truncate
			>Texto longo que não cabe na linha corta com reticências no final da linha atual do
			componente.</Text
		>
	</Stack>
</Stack>
