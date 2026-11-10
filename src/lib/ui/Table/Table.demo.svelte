<script lang="ts">
	import { Badge, EmptyState, Stack, Table, Text } from '../index';
	import { formatMoney } from '../format';

	type Sale = { id: number; buyer: string; product: string; cents: number; status: string };

	const sales: Sale[] = [
		{ id: 1, buyer: 'Marina Costa', product: 'Curso de Aquarela', cents: 19700, status: 'Pago' },
		{ id: 2, buyer: 'Rafael Lima', product: 'Mentoria 1:1', cents: 49000, status: 'Aguardando' },
		{
			id: 3,
			buyer: 'Júlia Nunes',
			product: 'Curso de Aquarela',
			cents: 19700,
			status: 'Reembolsado'
		},
		{ id: 4, buyer: 'Davi Souza', product: 'E-book de Cores', cents: 2900, status: 'Pago' }
	];

	const tones: Record<string, 'success' | 'warning' | 'indigo'> = {
		Pago: 'success',
		Aguardando: 'warning',
		Reembolsado: 'indigo'
	};

	const columns = [
		{ key: 'buyer', header: 'Comprador', sortable: true },
		{ key: 'product', header: 'Produto' },
		{ key: 'status', header: 'Status' },
		{ key: 'cents', header: 'Valor', align: 'end', sortable: true }
	] as const;

	let sort = $state<{ key: string; direction: 'asc' | 'desc' }>({ key: 'buyer', direction: 'asc' });

	const sorted = $derived(
		[...sales].sort((a, b) => {
			const x = a[sort.key as keyof Sale];
			const y = b[sort.key as keyof Sale];
			return (x < y ? -1 : x > y ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1);
		})
	);
</script>

<Stack gap={6}>
	<Table
		caption="Vendas recentes"
		columns={[...columns]}
		rows={sorted}
		rowKey={(row) => row.id}
		{sort}
		onsort={(next) => (sort = next)}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'status'}
				<Badge tone={tones[row.status]} dot>{row.status}</Badge>
			{:else if column.key === 'cents'}
				{formatMoney(row.cents)}
			{:else}
				{row[column.key]}
			{/if}
		{/snippet}
	</Table>

	<Stack gap={2}>
		<Text variant="footnote" tone="secondary">Carregando</Text>
		<Table
			caption="Carregando vendas"
			columns={[...columns]}
			rows={[] as Sale[]}
			rowKey={(row) => row.id}
			loading
		/>
	</Stack>

	<Stack gap={2}>
		<Text variant="footnote" tone="secondary">Vazia</Text>
		<Table caption="Sem vendas" columns={[...columns]} rows={[] as Sale[]} rowKey={(row) => row.id}>
			{#snippet empty()}
				<EmptyState icon="receipt" title="Nenhuma venda no período">
					Ajuste os filtros para ver outras datas.
				</EmptyState>
			{/snippet}
		</Table>
	</Stack>
</Stack>
