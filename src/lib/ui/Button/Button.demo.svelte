<script lang="ts">
	import { Button, Cluster, Stack, Text } from '../index';

	const variants = ['primary', 'neutral', 'ghost', 'danger'] as const;
	const sizes = ['sm', 'md', 'lg'] as const;
</script>

<Stack gap={8}>
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Variantes</Text>
		<Cluster gap={3}>
			{#each variants as variant (variant)}
				<Button {variant}>{variant}</Button>
			{/each}
		</Cluster>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Tamanhos (32, 40, 48)</Text>
		<Cluster gap={3}>
			{#each sizes as size (size)}
				<Button variant="primary" {size}>Continuar</Button>
			{/each}
		</Cluster>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Com ícone</Text>
		<Cluster gap={3}>
			<Button variant="primary" icon="plus">Novo projeto</Button>
			<Button icon="filter" iconEnd="chevron-down">Filtrar</Button>
			<Button variant="ghost" iconEnd="arrow-right">Próximo</Button>
			<Button variant="danger" icon="trash">Excluir</Button>
		</Cluster>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Só ícone (precisa de label)</Text>
		<Cluster gap={3}>
			<Button variant="primary" icon="plus" label="Adicionar" />
			<Button icon="settings" label="Configurações" />
			<Button variant="ghost" icon="more" label="Mais opções" />
			<Button size="sm" icon="x" label="Fechar" />
			<Button size="lg" icon="search" label="Buscar" />
		</Cluster>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium"
			>Estados: carregando, desabilitado, link</Text
		>
		<Cluster gap={3}>
			<Button variant="primary" loading="Salvando">Salvar</Button>
			<Button loading="Enviando">Enviar</Button>
			<Button variant="primary" disabled>Desabilitado</Button>
			<Button disabled>Desabilitado</Button>
			<Button href="#Button" icon="arrow-up-right">Link</Button>
		</Cluster>
		<Text variant="caption" tone="tertiary"
			>Foco: navegue com Tab. Pressionado: segure o clique.</Text
		>
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Largura total</Text>
		<Button variant="primary" size="lg" fullWidth>Finalizar compra</Button>
	</Stack>
</Stack>
