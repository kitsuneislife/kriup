<script lang="ts">
	import { Stack, Switch } from '../index';

	let notify = $state(true);
</script>

<Stack gap={4}>
	<Switch label="Avisar por e-mail a cada venda" bind:checked={notify} />
	<Switch label="Modo de teste" hint="Nenhum pagamento real é feito." />
	<Switch label="Ligado e desabilitado" checked disabled />
	<Switch label="Desabilitado" disabled />
</Stack>
