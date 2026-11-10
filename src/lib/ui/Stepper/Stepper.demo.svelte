<script lang="ts">
	import { Button, Cluster, Stack, Stepper } from '../index';

	const steps = ['Produto', 'Preço', 'Conteúdo', 'Publicar'];
	let current = $state(1);
</script>

<Stack gap={4}>
	<Stepper label="Criação do produto" {steps} {current} />
	<Cluster gap={2}>
		<Button size="sm" disabled={current === 0} onclick={() => current--}>Voltar</Button>
		<Button
			size="sm"
			variant="primary"
			disabled={current === steps.length - 1}
			onclick={() => current++}>Avançar</Button
		>
	</Cluster>
</Stack>
