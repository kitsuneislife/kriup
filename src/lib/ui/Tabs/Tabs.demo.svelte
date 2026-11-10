<script lang="ts">
	import { Tabs, Text } from '../index';

	let value = $state('sales');
</script>

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
		<Text tone="secondary">Aba selecionada: {current}. Use as setas, Home e End.</Text>
	{/snippet}
</Tabs>
