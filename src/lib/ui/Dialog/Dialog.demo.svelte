<script lang="ts">
	import { Button, Cluster, Dialog, Text } from '../index';

	let withdraw = $state(false);
	let remove = $state(false);
</script>

<Cluster gap={3}>
	<Button variant="primary" icon="wallet" onclick={() => (withdraw = true)}>Sacar saldo</Button>
	<Button variant="danger" icon="trash" onclick={() => (remove = true)}>Excluir produto</Button>
</Cluster>

<Dialog bind:open={withdraw} title="Sacar R$ 4.320,00?" closeLabel="Fechar">
	<Text variant="subhead" tone="secondary">
		O valor cai na conta cadastrada em até 2 dias úteis.
	</Text>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (withdraw = false)}>Cancelar</Button>
		<Button variant="primary" onclick={() => (withdraw = false)}>Confirmar saque</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={remove} title="Excluir “Curso de Fotografia”?" closeLabel="Fechar">
	<Text variant="subhead" tone="secondary">
		Os 48 alunos perdem o acesso e a página de venda sai do ar. Não dá para desfazer.
	</Text>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (remove = false)}>Cancelar</Button>
		<Button variant="danger" onclick={() => (remove = false)}>Excluir produto</Button>
	{/snippet}
</Dialog>
