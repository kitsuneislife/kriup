<script lang="ts">
	import { Disclosure, Stack, Text, TextField } from '../index';

	let title = $state('Curso de Aquarela');
</script>

<Stack gap={3}>
	<Disclosure title="Cabeçalho" icon="sparkles" summary="Título e subtítulo" open>
		<Stack gap={3}>
			<TextField label="Título" bind:value={title} />
			<TextField label="Subtítulo" placeholder="Uma frase que explica a promessa" />
		</Stack>
	</Disclosure>
	<Disclosure title="Depoimentos" icon="star" summary="3 itens">
		<Text tone="secondary">Mostre o que os alunos dizem.</Text>
	</Disclosure>
	<Disclosure title="Perguntas frequentes" icon="help">
		<Text tone="secondary">Responda as dúvidas antes de elas virarem reembolso.</Text>
	</Disclosure>
</Stack>
