<script lang="ts">
	import { Alert, Button, Stack } from '../index';
</script>

<Stack gap={3}>
	<Alert title="Saque agendado">Cai na sua conta na próxima terça-feira.</Alert>
	<Alert tone="success" title="Pagamento confirmado">O acesso do aluno já foi liberado.</Alert>
	<Alert tone="warning" title="Falta um passo"
		>Complete os dados bancários para sacar.
		{#snippet action()}<Button size="sm">Completar</Button>{/snippet}
	</Alert>
	<Alert tone="danger" title="Cartão recusado">Tente outro cartão ou pague com Pix.</Alert>
	<Alert>Sem título: uma linha curta de contexto.</Alert>
</Stack>
