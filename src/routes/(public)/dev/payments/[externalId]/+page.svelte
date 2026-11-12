<script lang="ts">
	import { resolve } from '$app/paths';
	import { Submission } from '#lib/forms.svelte';
	import { orderStatusText } from '#lib/order-text';
	import { Alert, Button, Card, Cluster, Money, Page, Stack, StatusBadge, Text } from '#lib/ui';

	let { data } = $props();
	const send = new Submission();
	const badge = $derived(orderStatusText[data.order.status]);
	const method = $derived(data.order.method === 'pix' ? 'Pix' : 'Cartão');
</script>

<svelte:head><title>Simulador de pagamento</title></svelte:head>

<main>
	<Page width="text">
		<Stack gap={6}>
			<Stack gap={2}>
				<Text variant="title1" as="h1">Simulador de pagamento</Text>
				<Text tone="secondary">
					Faz o papel do banco em desenvolvimento: escolha o que acontece com este pagamento.
				</Text>
			</Stack>

			<Card padding="lg">
				<Stack gap={4}>
					<Cluster justify="between" gap={3}>
						<Text weight="semibold">{data.order.productName}</Text>
						<StatusBadge status={badge.status} label={badge.label} />
					</Cluster>
					<Cluster justify="between" align="baseline" gap={3}>
						<Text tone="secondary">{method}</Text>
						<Money cents={data.order.grossCents} variant="title2" weight="bold" />
					</Cluster>
				</Stack>
			</Card>

			{#if data.order.status === 'pending'}
				<form method="post" use:send.enhance>
					<Cluster gap={3}>
						<Button type="submit" name="outcome" value="paid" variant="primary" icon="check">
							Aprovar pagamento
						</Button>
						<Button type="submit" name="outcome" value="declined" variant="danger" icon="x">
							Recusar
						</Button>
						<Button type="submit" name="outcome" value="expired" icon="clock">Expirar</Button>
					</Cluster>
				</form>
			{:else}
				<Alert>Este pagamento já foi resolvido.</Alert>
			{/if}

			<Text variant="subhead">
				<a href={resolve('/(public)/orders/[id]', { id: data.order.id })}>Ver a página do pedido</a>
			</Text>
		</Stack>
	</Page>
</main>
