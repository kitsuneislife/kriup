<script lang="ts">
	import { Field, Stack, Text } from '../index';
</script>

<Stack gap={4}>
	<Text variant="subhead" tone="secondary">
		Rótulo, ajuda e erro em volta de qualquer controle. TextField e Select já usam; use direto só em
		um controle novo.
	</Text>
	<Field id="field-demo" label="Código do cupom" hint="Letras e números, sem espaço.">
		<input id="field-demo" aria-describedby="field-demo-message" />
	</Field>
</Stack>
