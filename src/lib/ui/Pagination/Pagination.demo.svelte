<script lang="ts">
	import { Pagination, Stack, Text } from '../index';

	let page = $state(8);
	let few = $state(1);
</script>

<Stack gap={4}>
	<Pagination
		bind:page
		count={24}
		label="Páginas de vendas"
		previousLabel="Página anterior"
		nextLabel="Próxima página"
		pageLabel={(n) => `Página ${n}`}
	/>
	<Pagination
		bind:page={few}
		count={4}
		label="Páginas de alunos"
		previousLabel="Página anterior"
		nextLabel="Próxima página"
		pageLabel={(n) => `Página ${n}`}
	/>
	<Text variant="footnote" tone="secondary">Página atual: {page}</Text>
</Stack>
