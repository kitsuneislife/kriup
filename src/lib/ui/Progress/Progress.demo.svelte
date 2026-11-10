<script lang="ts">
	import { Cluster, Grid, Progress, Stack, Text } from '../index';

	const bars = [
		['Criação do produto', 'Passo 2 de 5', 40, 'accent'],
		['Perfil completo', 'Pronto para vender', 100, 'success'],
		['Saldo retido', 'Libera em 4 dias', 72, 'warning'],
		['Limite de envio', 'Quase no limite', 95, 'danger']
	] as const;
</script>

<Stack gap={8}>
	<Grid min="lg" gap={8}>
		{#each bars as [label, hint, value, tone] (label)}
			<Stack gap={2}>
				<Cluster justify="between">
					<Text variant="subhead" weight="medium">{label}</Text>
					<Text variant="footnote" tone="secondary" numeric>{value}%</Text>
				</Cluster>
				<Progress {label} {value} {tone} />
				<Text variant="footnote" tone="secondary">{hint}</Text>
			</Stack>
		{/each}
	</Grid>
	<Stack gap={2}>
		<Text variant="subhead" weight="medium">Indeterminado</Text>
		<Progress label="Enviando arquivo" />
		<Text variant="footnote" tone="secondary">Quando não dá para saber quanto falta.</Text>
	</Stack>
</Stack>
