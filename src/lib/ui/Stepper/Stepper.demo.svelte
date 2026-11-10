<script lang="ts">
	import { Button, Cluster, Stack, Stepper } from '../index';

	const steps = ['Produto', 'Preço', 'Conteúdo', 'Publicar'];
	let current = $state(1);
</script>

<Stack gap={8}>
	<Stepper label="Criação do produto" {steps} {current} />
	<Cluster justify="between">
		<Button variant="ghost" icon="arrow-left" disabled={current === 0} onclick={() => current--}
			>Voltar</Button
		>
		<Button
			variant="primary"
			iconEnd="arrow-right"
			disabled={current === steps.length - 1}
			onclick={() => current++}>Avançar</Button
		>
	</Cluster>
</Stack>
