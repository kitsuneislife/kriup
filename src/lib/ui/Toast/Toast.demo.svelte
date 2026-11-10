<script lang="ts">
	import { Button, Cluster, toast } from '../index';
</script>

<!-- The Toast host lives in the root layout. -->
<Cluster gap={3}>
	<Button onclick={() => toast.show({ title: 'Link copiado' })}>Aviso</Button>
	<Button
		onclick={() =>
			toast.show({
				tone: 'success',
				title: 'Produto publicado',
				description: 'Já dá para vender.'
			})}>Sucesso</Button
	>
	<Button
		onclick={() =>
			toast.show({
				tone: 'warning',
				title: 'Falta a conta bancária',
				description: 'Sem ela o saque não sai.'
			})}>Atenção</Button
	>
	<Button
		variant="danger"
		onclick={() =>
			toast.show({
				tone: 'danger',
				title: 'Não foi possível salvar',
				description: 'Tente de novo em instantes.'
			})}>Erro</Button
	>
</Cluster>
