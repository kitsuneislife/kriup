<script lang="ts">
	import { Grid, Select } from '../index';

	let period = $state('30');
	const options = [
		{ value: '7', label: 'Últimos 7 dias' },
		{ value: '30', label: 'Últimos 30 dias' },
		{ value: '90', label: 'Últimos 90 dias' }
	];
</script>

<Grid min="md" gap={6}>
	<Select label="Período" {options} bind:value={period} icon="clock" />
	<Select label="Com erro" {options} error="Escolha um período." />
	<Select label="Desabilitado" {options} disabled />
</Grid>
