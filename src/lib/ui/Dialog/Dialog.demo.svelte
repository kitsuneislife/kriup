<script lang="ts">
	import { Button, Dialog, Text } from '../index';

	let open = $state(false);
</script>

<Button variant="primary" onclick={() => (open = true)}>Abrir diálogo</Button>

<Dialog bind:open title="Sacar R$ 4.320,00?" closeLabel="Fechar">
	<Text variant="subhead" tone="secondary">
		O valor cai na conta cadastrada em até 2 dias úteis. Essa ação não pode ser desfeita.
	</Text>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>Cancelar</Button>
		<Button variant="primary" onclick={() => (open = false)}>Confirmar saque</Button>
	{/snippet}
</Dialog>
