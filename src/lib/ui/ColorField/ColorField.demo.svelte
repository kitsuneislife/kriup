<script lang="ts">
	import { ColorField, Grid, Text } from '../index';

	let brand = $state('#0a84ff');
</script>

<Grid min="md" gap={4}>
	<ColorField
		label="Cor da marca"
		hint="Usada nos botões da sua página"
		pickerLabel="Escolher cor"
		bind:value={brand}
	/>
	<ColorField
		label="Cor inválida"
		error="Use seis dígitos, como #0a84ff"
		pickerLabel="Escolher cor"
		value="#ff453a"
	/>
	<ColorField label="Bloqueada" pickerLabel="Escolher cor" value="#8e8e93" disabled />
</Grid>
<Text variant="footnote" tone="secondary">Valor atual: {brand}</Text>
