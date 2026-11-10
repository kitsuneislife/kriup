<script lang="ts">
	import { SegmentedControl, Stack } from '../index';

	let view = $state('grid');
	let range = $state('month');
	let theme = $state('system');
</script>

<Stack gap={6} align="start">
	<SegmentedControl
		label="Visualização"
		bind:value={view}
		options={[
			{ value: 'list', label: 'Lista', icon: 'list' },
			{ value: 'grid', label: 'Grade', icon: 'grid' }
		]}
	/>
	<SegmentedControl
		label="Período"
		size="sm"
		bind:value={range}
		options={[
			{ value: 'week', label: 'Semana' },
			{ value: 'month', label: 'Mês' },
			{ value: 'year', label: 'Ano' }
		]}
	/>
	<SegmentedControl
		label="Tema"
		iconOnly
		bind:value={theme}
		options={[
			{ value: 'light', label: 'Claro', icon: 'sun' },
			{ value: 'system', label: 'Sistema', icon: 'monitor' },
			{ value: 'dark', label: 'Escuro', icon: 'moon' }
		]}
	/>
</Stack>
