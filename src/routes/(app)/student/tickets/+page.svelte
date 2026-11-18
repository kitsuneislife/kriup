<script lang="ts">
	import { resolve } from '$app/paths';
	import { ticketStatusText } from '#lib/ticket-text';
	import { Badge, Button, Card, Cluster, DateTime, EmptyState, Page, Stack, Text } from '#lib/ui';

	let { data } = $props();
</script>

<svelte:head><title>Chamados</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Cluster justify="between" gap={4}>
			<Text variant="title1" as="h1">Chamados</Text>
			{#if data.tickets.length > 0}
				<Button variant="primary" icon="plus" href={resolve('/(app)/student/tickets/new')}>
					Novo chamado
				</Button>
			{/if}
		</Cluster>

		{#if data.tickets.length === 0}
			<EmptyState icon="message" title="Nenhum chamado ainda">
				Teve algum problema com uma compra? Abra um chamado e a equipe de suporte responde por aqui.
				{#snippet action()}
					<Button variant="primary" icon="plus" href={resolve('/(app)/student/tickets/new')}>
						Abrir um chamado
					</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<Stack as="ul" gap={3}>
				{#each data.tickets as ticket (ticket.id)}
					{@const status = ticketStatusText[ticket.status]}
					<li>
						<Card href={resolve('/(app)/student/tickets/[id]', { id: ticket.id })} padding="lg">
							<Stack gap={2}>
								<Cluster justify="between" gap={3}>
									<Badge tone={status.tone} dot>{status.label}</Badge>
									<Text variant="footnote" tone="secondary">
										<DateTime value={ticket.createdAt} format="date" />
									</Text>
								</Cluster>
								<Text variant="title3" as="h2" truncate>{ticket.subject}</Text>
								<Text variant="footnote" tone="secondary">{ticket.productName}</Text>
							</Stack>
						</Card>
					</li>
				{/each}
			</Stack>
		{/if}
	</Stack>
</Page>
