<script lang="ts">
	import { resolve } from '$app/paths';
	import { producerDeadline, producerQueue, producerRefundStatus } from '#lib/refund-text';
	import {
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

	const queue = $derived(producerQueue(data.refunds, data.now));
</script>

<svelte:head><title>Reembolsos</title></svelte:head>

{#snippet item(refund: (typeof data.refunds)[number], waiting: boolean)}
	{@const badge = producerRefundStatus(refund, data.now)}
	{@const deadline = producerDeadline(refund.dueAt, data.now)}
	<Card as="li" padding="lg">
		<Stack gap={4}>
			<Cluster justify="between" gap={3}>
				<Stack gap={1}>
					<Text weight="semibold" as="h3">{refund.studentName}</Text>
					<Text variant="footnote" tone="secondary">
						{refund.productName} · <Money cents={refund.grossCents} variant="footnote" />
					</Text>
				</Stack>
				<StatusBadge status={badge.status} label={badge.label} size="sm" />
			</Cluster>
			<Text variant="subhead" tone="secondary" truncate>“{refund.reason}”</Text>
			<Cluster justify="between" gap={3}>
				{#if waiting}
					<Text variant="footnote" tone={deadline.tone}>
						<strong>{deadline.label}</strong> · até <DateTime value={refund.dueAt} />
					</Text>
				{:else}
					<Text variant="footnote" tone="secondary">
						Pedido em <DateTime value={refund.openedAt} format="date" />
					</Text>
				{/if}
				<Button
					size="sm"
					variant={waiting ? 'neutral' : 'ghost'}
					iconEnd="arrow-right"
					href={resolve('/(app)/producer/refunds/[id]', { id: refund.id })}
					label="{waiting ? 'Responder' : 'Ver pedido'} de {refund.studentName}"
				>
					{waiting ? 'Responder' : 'Ver pedido'}
				</Button>
			</Cluster>
		</Stack>
	</Card>
{/snippet}

<Page width="text">
	<Stack gap={8}>
		<Stack gap={2}>
			<Text variant="title1" as="h1">Reembolsos</Text>
			<Text tone="secondary">
				Os pedidos feitos depois da garantia chegam aqui. Responda cada um até o prazo; sem
				resposta, a plataforma decide.
			</Text>
		</Stack>

		{#if data.refunds.length === 0}
			<EmptyState icon="receipt" title="Nenhum pedido de reembolso">
				Quando um aluno pedir reembolso depois da garantia, o pedido aparece aqui com o prazo para
				você responder. Dentro da garantia, o reembolso é automático.
			</EmptyState>
		{:else}
			<Stack gap={4} as="section">
				<Stack gap={1}>
					<Text variant="title3" as="h2">Esperando sua resposta</Text>
					<Text variant="footnote" tone="secondary">O prazo mais próximo primeiro.</Text>
				</Stack>
				{#if queue.waiting.length === 0}
					<Text tone="secondary">Nenhum pedido espera por você agora.</Text>
				{:else}
					<Stack gap={3} as="ul">
						{#each queue.waiting as refund (refund.id)}{@render item(refund, true)}{/each}
					</Stack>
				{/if}
			</Stack>

			{#if queue.others.length > 0}
				<Stack gap={4} as="section">
					<Text variant="title3" as="h2">Anteriores</Text>
					<Stack gap={3} as="ul">
						{#each queue.others as refund (refund.id)}{@render item(refund, false)}{/each}
					</Stack>
				</Stack>
			{/if}
		{/if}
	</Stack>
</Page>
