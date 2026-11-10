<script lang="ts">
	import { Button, Cluster, Menu, Text } from '../index';

	let last = $state('nenhuma');
</script>

<Cluster gap={4} align="center">
	<Menu
		label="Ações do produto"
		items={[
			{ label: 'Editar', icon: 'edit', onselect: () => (last = 'Editar') },
			{ label: 'Copiar link', icon: 'link', onselect: () => (last = 'Copiar link') },
			{ label: 'Ver como aluno', icon: 'eye', disabled: true },
			{
				label: 'Arquivar',
				icon: 'trash',
				danger: true,
				separator: true,
				onselect: () => (last = 'Arquivar')
			}
		]}
	>
		{#snippet trigger(props)}
			<Button iconEnd="chevron-down" haspopup="menu" {...props}>Ações</Button>
		{/snippet}
	</Menu>

	<Menu
		label="Conta"
		align="end"
		items={[
			{ label: 'Minha conta', icon: 'user', href: '/account' },
			{ label: 'Sair', icon: 'logout', onselect: () => (last = 'Sair') }
		]}
	>
		{#snippet trigger(props)}
			<Button variant="ghost" icon="more" label="Conta" haspopup="menu" {...props} />
		{/snippet}
	</Menu>

	<Text variant="footnote" tone="secondary">Última escolha: {last}</Text>
</Cluster>
