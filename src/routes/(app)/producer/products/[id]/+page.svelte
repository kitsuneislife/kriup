<script lang="ts">
	import { resolve } from '$app/paths';
	import { productStatusText } from '#lib/product-text';
	import { Badge, Breadcrumb, Cluster, EmptyState, Page, Stack, Text } from '#lib/ui';

	let { data } = $props();
	const status = $derived(productStatusText[data.product.status]);
</script>

<svelte:head><title>{data.product.name}</title></svelte:head>

<!-- Placeholder until batch 2.4 builds the editor. -->
<Page>
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Produtos', href: resolve('/(app)/producer') },
					{ label: data.product.name }
				]}
			/>
			<Text variant="title1" as="h1">{data.product.name}</Text>
			<Cluster><Badge tone={status.tone} dot>{status.label}</Badge></Cluster>
		</Stack>
		<EmptyState icon="edit" title="O editor está chegando">
			Em breve você ajusta a página de venda, as aulas e as ofertas por aqui.
		</EmptyState>
	</Stack>
</Page>
