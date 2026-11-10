<script lang="ts">
	import { Button, Card, EmptyState, Stack } from '../index';
</script>

<Stack gap={4}>
	<Card>
		<EmptyState icon="package" title="Nenhum produto ainda">
			Crie o primeiro produto para começar a vender.
			{#snippet action()}<Button variant="primary" icon="plus">Criar produto</Button>{/snippet}
		</EmptyState>
	</Card>
	<Card>
		<EmptyState icon="search" title="Nada encontrado" />
	</Card>
</Stack>
