<script lang="ts">
	import { Breadcrumb, Stack } from '../index';
</script>

<Stack gap={3}>
	<Breadcrumb
		label="Você está em"
		items={[
			{ label: 'Produtos', href: '/produtos' },
			{ label: 'Curso de Aquarela', href: '/produtos/aquarela' },
			{ label: 'Aulas' }
		]}
	/>
	<Breadcrumb label="Você está em" items={[{ label: 'Produtos' }]} />
</Stack>
