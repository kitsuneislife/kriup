<script lang="ts">
	import { resolve } from '$app/paths';
	import { orderStatusText } from '#lib/order-text';
	import { refundStatusText } from '#lib/refund-text';
	import {
		Badge,
		Button,
		Card,
		Cluster,
		DateTime,
		EmptyState,
		Money,
		Page,
		Stack,
		StatusBadge,
		Text
	} from '#lib/ui';

	let { data } = $props();

	const access = {
		active: { label: 'Acesso liberado', tone: 'success' },
		revoked: { label: 'Acesso encerrado', tone: 'neutral' }
	} as const;
</script>

<svelte:head><title>Pedidos</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={2}>
			<Text variant="title1" as="h1">Pedidos</Text>
			<Text tone="secondary">Suas compras, o acesso a cada uma e os pedidos de reembolso.</Text>
		</Stack>

		{#if data.orders.length === 0}
			<EmptyState icon="receipt" title="Você ainda não comprou nada">
				Quando você comprar um produto, o pedido e o acesso aparecem aqui.
			</EmptyState>
		{:else}
			<Stack gap={4} as="ul">
				{#each data.orders as order (order.id)}
					{@const status = orderStatusText[order.status]}
					<Card as="li" padding="lg">
						<Stack gap={4}>
							<Cluster justify="between" gap={3}>
								<Text variant="title3" as="h2">{order.productName}</Text>
								<Money cents={order.grossCents} weight="semibold" />
							</Cluster>
							<Cluster gap={2}>
								<StatusBadge status={status.status} label={status.label} size="sm" />
								{#if order.enrollmentStatus}
									{@const a = access[order.enrollmentStatus]}
									<Badge tone={a.tone} size="sm" dot>{a.label}</Badge>
								{/if}
								{#if order.refundStatus}
									{@const r = refundStatusText[order.refundStatus]}
									<StatusBadge status={r.status} label="Reembolso: {r.label}" size="sm" />
								{/if}
							</Cluster>
							<Text variant="footnote" tone="secondary">
								{#if order.paidAt}
									Pago em <DateTime value={order.paidAt} format="date" />
								{:else}
									Pedido feito em <DateTime value={order.createdAt} format="date" />
								{/if}
								{#if order.guaranteeUntil}
									· garantia até <DateTime value={order.guaranteeUntil} format="date" />
								{/if}
							</Text>
							<Cluster gap={2}>
								{#if order.enrollmentStatus === 'active'}
									<Button
										variant="primary"
										href={resolve('/(app)/student/courses/[id]', { id: order.productId })}
										iconEnd="arrow-right"
										label="Acessar curso {order.productName}"
									>
										Acessar curso
									</Button>
								{/if}
								{#if order.refundId}
									<Button
										href={resolve('/(app)/student/refunds/[id]', { id: order.refundId })}
										iconEnd="arrow-right"
										label="Ver reembolso de {order.productName}"
									>
										Ver reembolso
									</Button>
								{:else if order.status === 'paid'}
									<Button
										href={resolve('/(app)/student/orders/[id]/refund', { id: order.id })}
										label="Pedir reembolso de {order.productName}"
									>
										Pedir reembolso
									</Button>
								{/if}
								<Button
									variant="ghost"
									icon="message"
									href="{resolve('/(app)/student/tickets/new')}?order={order.id}"
									label="Falar com o suporte sobre {order.productName}"
								>
									Falar com o suporte
								</Button>
							</Cluster>
						</Stack>
					</Card>
				{/each}
			</Stack>
		{/if}
	</Stack>
</Page>
