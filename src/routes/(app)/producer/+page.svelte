<script lang="ts">
	import { resolve } from '$app/paths';
	import { productStatusText, productTypeText } from '#lib/product-text';
	import {
		Badge,
		Button,
		Card,
		Cluster,
		EmptyState,
		Grid,
		Icon,
		Money,
		Page,
		Stack,
		Text
	} from '#lib/ui';

	let { data } = $props();
</script>

<svelte:head><title>Produtos</title></svelte:head>

<Page>
	<Stack gap={8}>
		<Cluster justify="between" gap={4}>
			<Text variant="title1" as="h1">Produtos</Text>
			{#if data.products.length > 0}
				<Button variant="primary" icon="plus" href={resolve('/(app)/producer/new')}>
					Novo produto
				</Button>
			{/if}
		</Cluster>

		{#if data.products.length === 0}
			<EmptyState icon="package" title="Nenhum produto ainda">
				Responda algumas perguntas e o rascunho do seu primeiro produto fica pronto, com página
				de venda e aulas para você ajustar.
				{#snippet action()}
					<Button variant="primary" icon="sparkles" href={resolve('/(app)/producer/new')}>
						Criar meu primeiro produto
					</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<Grid as="ul" min="md" gap={4}>
				{#each data.products as product (product.id)}
					{@const type = productTypeText[product.type]}
					{@const status = productStatusText[product.status]}
					{@const draft = product.status === 'draft'}
					<Card as="li" padding="lg">
						<Stack gap={6}>
							<Stack gap={2}>
								<Cluster gap={2} wrap={false}>
									<Text tone="secondary"><Icon name={type.icon} size="sm" /></Text>
									<Text variant="footnote" tone="secondary">{type.label}</Text>
								</Cluster>
								<Text variant="title3" as="h2" truncate>{product.name}</Text>
							</Stack>
							<Cluster justify="between" gap={3}>
								<Badge tone={status.tone} dot>{status.label}</Badge>
								{#if product.minPriceCents === null}
									<Text variant="subhead" tone="warning">Sem oferta</Text>
								{:else}
									<Cluster gap={1} align="baseline" wrap={false}>
										{#if product.offerCount > 1}
											<Text variant="footnote" tone="secondary">a partir de</Text>
										{/if}
										<Money cents={product.minPriceCents} weight="semibold" />
									</Cluster>
								{/if}
							</Cluster>
							<Button
								variant={draft ? 'primary' : 'neutral'}
								iconEnd="arrow-right"
								fullWidth
								href={resolve('/(app)/producer/products/[id]', { id: product.id })}
								label="{draft ? 'Continuar criação' : 'Gerenciar'} de {product.name}"
							>
								{draft ? 'Continuar criação' : 'Gerenciar'}
							</Button>
						</Stack>
					</Card>
				{/each}
			</Grid>
		{/if}
	</Stack>
</Page>
