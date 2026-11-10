<script lang="ts">
	import { Stack, Tabs, Text } from '../index';

	let value = $state('sales');

	const panels: Record<string, [title: string, body: string]> = {
		sales: ['12 vendas hoje', 'Cada venda aparece aqui assim que o pagamento é confirmado.'],
		students: ['48 alunos ativos', 'Quem comprou e já pode acessar o conteúdo.'],
		refunds: ['2 pedidos abertos', 'Responda em até 7 dias para não perder o prazo.'],
		settings: ['Ajustes do produto', 'Preço, garantia e página de obrigado.']
	};
</script>

<Stack gap={3}>
	<Tabs
		label="Painel do produto"
		bind:value
		tabs={[
			{ value: 'sales', label: 'Vendas', icon: 'receipt', count: 12 },
			{ value: 'students', label: 'Alunos', icon: 'users', count: 48 },
			{ value: 'refunds', label: 'Reembolsos', icon: 'refresh', count: 2 },
			{ value: 'settings', label: 'Ajustes', icon: 'settings' }
		]}
	>
		{#snippet children(current)}
			{@const panel = panels[current]}
			{#if panel}
				<Stack gap={1}>
					<Text variant="title3">{panel[0]}</Text>
					<Text variant="subhead" tone="secondary">{panel[1]}</Text>
				</Stack>
			{/if}
		{/snippet}
	</Tabs>
	<Text variant="caption" tone="tertiary">Teclado: setas, Home e End.</Text>
</Stack>
