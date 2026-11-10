<script lang="ts">
	import { Checkbox, Stack } from '../index';

	let terms = $state(true);
</script>

<Stack gap={4}>
	<Checkbox label="Li e aceito os termos" bind:checked={terms} />
	<Checkbox label="Receber novidades" hint="No máximo um e-mail por semana." />
	<Checkbox label="Marcado e desabilitado" checked disabled />
	<Checkbox label="Desabilitado" disabled />
</Stack>
