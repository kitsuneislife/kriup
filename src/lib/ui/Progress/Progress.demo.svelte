<script lang="ts">
	import { Progress, Stack, Text } from '../index';
</script>

<Stack gap={6}>
	<Stack gap={2}>
		<Text variant="footnote" tone="secondary">Passo 2 de 5</Text>
		<Progress label="Criação do produto" value={40} />
	</Stack>
	<Progress label="Concluído" value={100} tone="success" />
	<Progress label="Atenção" value={72} tone="warning" />
	<Progress label="Limite" value={95} tone="danger" />
	<Stack gap={2}>
		<Text variant="footnote" tone="secondary">Indeterminado</Text>
		<Progress label="Enviando arquivo" />
	</Stack>
</Stack>
