<script lang="ts">
	import { formatHoursMetric, pluralOrders } from '#lib/support-text';
	import {
		Card,
		Chart,
		Divider,
		EmptyState,
		Grid,
		Money,
		Page,
		Stack,
		Stat,
		Table,
		Text
	} from '#lib/ui';

	let { data } = $props();

	const metrics = $derived(data.metrics);
	const totalTickets = $derived(
		metrics.ticketsByProducer.reduce((sum, row) => sum + row.ticketCount, 0)
	);
	const openTickets = $derived(
		metrics.ticketsByProducer.reduce((sum, row) => sum + row.openTicketCount, 0)
	);
	const recentOrdersCount = $derived(
		metrics.dailyOrders.counts.reduce((sum, count) => sum + count, 0)
	);
	const recentVolumeCents = $derived(
		metrics.dailyOrders.volumeCents.reduce((sum, cents) => sum + cents, 0)
	);

	const producerColumns = [
		{ key: 'producerName', header: 'Produtor' },
		{ key: 'producerEmail', header: 'E-mail' },
		{ key: 'openTicketCount', header: 'Abertos', align: 'end' },
		{ key: 'ticketCount', header: 'Total', align: 'end' }
	] as const;
</script>

<svelte:head><title>Métricas da plataforma</title></svelte:head>

<Page width="page">
	<Stack gap={8}>
		<Stack gap={2}>
			<Text variant="title1" as="h1">Métricas da plataforma</Text>
			<Text tone="secondary">
				Indicadores do Lean Canvas e visão operacional de vendas, taxas, bloqueios e chamados.
			</Text>
		</Stack>

		<Grid min="sm" gap={4}>
			<Card padding="lg">
				<Stat
					label="Tempo até publicar"
					icon="clock"
					tone="accent"
					hint="Mediana do cadastro ao 1º produto"
				>
					<Text variant="title2" weight="semibold" numeric>
						{formatHoursMetric(metrics.medianHoursToFirstPublish)}
					</Text>
				</Stat>
			</Card>
			<Card padding="lg">
				<Stat
					label="Taxa de publicação"
					icon="package"
					tone="success"
					hint="{metrics.conversion.publishedProducts} de {metrics.conversion
						.totalProducts} produtos"
				>
					<Text variant="title2" weight="semibold" numeric>
						{metrics.conversion.publishedRatePercent}%
					</Text>
				</Stat>
			</Card>
			<Card padding="lg">
				<Stat
					label="Primeira resposta em reembolso"
					icon="refresh"
					tone="warning"
					hint="Mediana até a 1ª resposta"
				>
					<Text variant="title2" weight="semibold" numeric>
						{formatHoursMetric(metrics.medianHoursToFirstRefundResponse)}
					</Text>
				</Stat>
			</Card>
			<Card padding="lg">
				<Stat label="Total de chamados" icon="message" hint="{openTickets} em aberto agora">
					<Text variant="title2" weight="semibold" numeric>{totalTickets}</Text>
				</Stat>
			</Card>
		</Grid>

		<Stack gap={4} as="section">
			<Text variant="title3" as="h2">Resumo financeiro e operacional</Text>
			<Card padding="lg">
				<Stack gap={6}>
					<Grid min="sm" gap={6}>
						<Stat label="Volume pago" icon="wallet" tone="success" hint="Pedidos pagos vigentes">
							<Money cents={metrics.grossVolumeCents} variant="title2" weight="semibold" />
						</Stat>
						<Stat
							label="Receita de taxa da plataforma"
							icon="trending"
							tone="accent"
							hint="Taxas sobre pedidos pagos"
						>
							<Money cents={metrics.platformFeeCents} variant="title2" weight="semibold" />
						</Stat>
						<Stat label="Pedidos pagos" icon="receipt" hint="Ativos na plataforma">
							<Text variant="title2" weight="semibold" numeric>{metrics.paidOrdersCount}</Text>
						</Stat>
						<Stat
							label="Bloqueios ativos"
							icon="shield"
							tone={metrics.activeBlocksCount > 0 ? 'warning' : 'neutral'}
							hint="Em vigor neste momento"
						>
							<Text variant="title2" weight="semibold" numeric>{metrics.activeBlocksCount}</Text>
						</Stat>
					</Grid>

					<Divider />

					<Stack gap={3}>
						<Text variant="subhead" weight="medium">Pedidos pagos nos últimos 7 dias</Text>
						<Chart
							kind="bar"
							tone="accent"
							label="Pedidos pagos nos últimos 7 dias"
							values={metrics.dailyOrders.counts}
							labels={metrics.dailyOrders.labels}
							format={pluralOrders}
						/>
						<Text variant="footnote" tone="secondary">
							{pluralOrders(recentOrdersCount)} nos últimos 7 dias · volume bruto de
							<Money cents={recentVolumeCents} variant="footnote" weight="semibold" />
						</Text>
					</Stack>
				</Stack>
			</Card>
		</Stack>

		<Stack gap={4} as="section">
			<Stack gap={1}>
				<Text variant="title3" as="h2">Chamados por produtor</Text>
				<Text variant="footnote" tone="secondary">
					Ordenado pelo maior volume de chamados abertos e encerrados.
				</Text>
			</Stack>

			{#if metrics.ticketsByProducer.length === 0}
				<EmptyState icon="message" title="Nenhum chamado registrado">
					Quando alunos abrirem chamados sobre pedidos, a distribuição por produtor aparece aqui.
				</EmptyState>
			{:else}
				<Table
					caption="Chamados por produtor"
					columns={[...producerColumns]}
					rows={metrics.ticketsByProducer}
					rowKey={(row) => row.producerId}
				/>
			{/if}
		</Stack>
	</Stack>
</Page>
