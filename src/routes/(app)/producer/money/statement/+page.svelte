<script lang="ts">
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { entryStateText, entryTypeText } from '#lib/statement-filters';
	import {
		Alert,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		DateTime,
		EmptyState,
		Money,
		Page,
		Select,
		Stack,
		StatusBadge,
		Table,
		Text,
		TextField
	} from '#lib/ui';

	let { data } = $props();

	const base = resolve('/(app)/producer/money/statement');
	const columns = [
		{ key: 'createdAt', header: 'Data' },
		{ key: 'productName', header: 'Produto' },
		{ key: 'reason', header: 'Regra aplicada' },
		{ key: 'state', header: 'Estado' },
		{ key: 'amountCents', header: 'Valor', align: 'end' }
	] as const;

	const productOptions = $derived([
		{ value: '', label: 'Todos os produtos' },
		...data.products.map((p) => ({ value: p.id, label: p.name }))
	]);
	const stateOptions = [
		{ value: '', label: 'Todos os estados' },
		...Object.entries(entryStateText).map(([value, t]) => ({ value, label: t.label }))
	];
	const filtered = $derived(Object.values(data.values).some((v) => v !== ''));

	/** The same filters on another page. */
	function pageHref(page: number) {
		const params = new SvelteURLSearchParams();
		for (const [key, value] of Object.entries(data.values)) if (value) params.set(key, value);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return query ? `${base}?${query}` : base;
	}

	const percent = (bp: number) => `${(bp / 100).toLocaleString('pt-BR')}%`;
</script>

<svelte:head><title>Extrato</title></svelte:head>

<Page width="page">
	<Stack gap={8}>
		<Stack gap={2}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Dinheiro', href: resolve('/(app)/producer/money') },
					{ label: 'Extrato' }
				]}
			/>
			<Text variant="title1" as="h1">Extrato</Text>
			<Text tone="secondary">
				Cada lançamento com a regra que o gerou: valor bruto, taxa da plataforma e, na coprodução, o
				percentual e a parte do produtor.
			</Text>
		</Stack>

		<Card padding="lg">
			<form method="get" action={base} aria-label="Filtros do extrato">
				<Stack gap={4}>
					<Cluster gap={4} align="end">
						<Select
							label="Produto"
							name="product"
							value={data.values.product}
							options={productOptions}
						/>
						<Select label="Estado" name="state" value={data.values.state} options={stateOptions} />
						<TextField label="De" name="from" type="date" value={data.values.from} />
						<TextField label="Até" name="to" type="date" value={data.values.to} />
					</Cluster>
					<Cluster gap={2}>
						<Button type="submit" variant="primary" icon="search">Filtrar</Button>
						{#if filtered}
							<Button href={base} variant="ghost">Limpar filtros</Button>
						{/if}
					</Cluster>
				</Stack>
			</form>
		</Card>

		{#if data.ignored}
			<Alert tone="warning">
				Alguns filtros do endereço não são válidos e foram ignorados. Confira os campos acima.
			</Alert>
		{/if}

		<Table caption="Extrato" columns={[...columns]} rows={data.entries} rowKey={(row) => row.id}>
			{#snippet cell(row, column)}
				{#if column.key === 'createdAt'}
					<DateTime value={row.createdAt} format="date" />
				{:else if column.key === 'productName'}
					{row.productName ?? entryTypeText[row.type]}
				{:else if column.key === 'reason'}
					<Stack gap={1}>
						<Text variant="subhead" as="span">{row.reason}</Text>
						{#if row.grossCents !== null && row.feeCents !== null}
							<Text variant="footnote" tone="secondary" as="span">
								Bruto <Money cents={row.grossCents} variant="footnote" tone="secondary" />
								· taxa da plataforma
								<Money cents={row.feeCents} variant="footnote" tone="secondary" />
							</Text>
						{/if}
						{#if row.percentBp !== null}
							<Text variant="footnote" tone="secondary" as="span">
								Coprodução de {percent(row.percentBp)}
								{#if row.producerCents !== null}
									· parte do produtor
									<Money cents={row.producerCents} variant="footnote" tone="secondary" />
								{/if}
							</Text>
						{/if}
						{#if row.state === 'held' && row.releaseAt}
							<Text variant="footnote" tone="secondary" as="span">
								Liberado em <DateTime value={row.releaseAt} format="date" />
							</Text>
						{/if}
					</Stack>
				{:else if column.key === 'state'}
					{@const s = entryStateText[row.state]}
					<StatusBadge status={s.status} label={s.label} size="sm" />
				{:else}
					<Money cents={row.amountCents} weight="semibold" />
				{/if}
			{/snippet}
			{#snippet empty()}
				{#if filtered}
					<EmptyState icon="receipt" title="Nenhum lançamento com esses filtros">
						Ajuste ou limpe os filtros para ver outros lançamentos.
					</EmptyState>
				{:else}
					<EmptyState icon="receipt" title="Nenhum lançamento ainda">
						As vendas, os estornos e os saques aparecem aqui, cada um com a regra aplicada.
					</EmptyState>
				{/if}
			{/snippet}
		</Table>

		{#if data.page > 1 || data.hasMore}
			<nav aria-label="Páginas do extrato">
				<Cluster gap={3} justify="between">
					{#if data.page > 1}
						<Button href={pageHref(data.page - 1)} icon="arrow-left">Anterior</Button>
					{:else}
						<span></span>
					{/if}
					<Text tone="secondary" variant="footnote">Página {data.page}</Text>
					{#if data.hasMore}
						<Button href={pageHref(data.page + 1)} iconEnd="arrow-right">Próxima</Button>
					{:else}
						<span></span>
					{/if}
				</Cluster>
			</nav>
		{/if}
	</Stack>
</Page>
