<script lang="ts">
	import { resolve } from '$app/paths';
	import { escalationText, supportDeadline } from '#lib/refund-text';
	import { payoutsBannerTitle } from '#lib/support-text';
	import {
		Alert,
		Badge,
		Button,
		Card,
		Cluster,
		DateTime,
		EmptyState,
		Money,
		Page,
		Stack,
		Text
	} from '#lib/ui';

	let { data } = $props();
</script>

<svelte:head><title>Fila do suporte</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={2}>
			<Text variant="title1" as="h1">Fila do suporte</Text>
			<Text tone="secondary">
				Os reembolsos que passaram para a plataforma, do prazo mais próximo ao mais distante, e os
				chamados abertos, do mais antigo ao mais novo.
			</Text>
		</Stack>

		{#if data.refunds.length === 0 && data.tickets.length === 0 && data.payouts.length === 0}
			<EmptyState icon="check-circle" title="A fila está vazia">
				Quando um produtor perder o prazo, um aluno contestar uma recusa ou abrir um chamado, o
				pedido aparece aqui.
			</EmptyState>
		{:else}
			{#if data.payouts.length > 0}
				<Alert tone="info" title={payoutsBannerTitle(data.payouts.length)}>
					Há solicitações aguardando transferência e confirmação da equipe.
					{#snippet action()}
						<Button size="sm" href={resolve('/(app)/support/payouts')}>Revisar saques</Button>
					{/snippet}
				</Alert>
			{/if}

			<Stack gap={4} as="section">
				<Stack gap={1}>
					<Text variant="title3" as="h2">Reembolsos</Text>
					<Text variant="footnote" tone="secondary">
						O produtor não respondeu no prazo ou o aluno contestou a recusa. A decisão da plataforma
						é final.
					</Text>
				</Stack>
				{#if data.refunds.length === 0}
					<Text tone="secondary">Nenhum reembolso espera pela plataforma agora.</Text>
				{:else}
					<Stack gap={3} as="ul">
						{#each data.refunds as refund (refund.id)}
							{@const deadline = supportDeadline(refund.dueAt, data.now)}
							<Card as="li" padding="lg">
								<Stack gap={4}>
									<Cluster justify="between" gap={3}>
										<Stack gap={1}>
											<Text weight="semibold" as="h3">{refund.studentName}</Text>
											<Text variant="footnote" tone="secondary">
												{refund.productName} · <Money
													cents={refund.grossCents}
													variant="footnote"
												/>
											</Text>
										</Stack>
										<Badge tone={refund.contested ? 'warning' : 'accent'} size="sm">
											{escalationText(refund.contested)}
										</Badge>
									</Cluster>
									<Text variant="subhead" tone="secondary" truncate>“{refund.reason}”</Text>
									<Cluster justify="between" gap={3}>
										<Text variant="footnote" tone={deadline.tone}>
											<strong>{deadline.label}</strong> · até <DateTime value={refund.dueAt} />
										</Text>
										<Button
											size="sm"
											iconEnd="arrow-right"
											href={resolve('/(app)/support/refunds/[id]', { id: refund.id })}
											label="Decidir reembolso de {refund.studentName}"
										>
											Decidir
										</Button>
									</Cluster>
								</Stack>
							</Card>
						{/each}
					</Stack>
				{/if}
			</Stack>

			<Stack gap={4} as="section">
				<Stack gap={1}>
					<Text variant="title3" as="h2">Chamados abertos</Text>
					<Text variant="footnote" tone="secondary">O mais antigo primeiro.</Text>
				</Stack>
				{#if data.tickets.length === 0}
					<Text tone="secondary">Nenhum chamado aberto agora.</Text>
				{:else}
					<Stack gap={3} as="ul">
						{#each data.tickets as ticket (ticket.id)}
							<Card as="li" padding="lg">
								<Stack gap={4}>
									<Stack gap={1}>
										<Text weight="semibold" as="h3">{ticket.subject}</Text>
										<Text variant="footnote" tone="secondary">
											{ticket.studentName} · {ticket.productName}
										</Text>
									</Stack>
									<Cluster justify="between" gap={3}>
										<Text variant="footnote" tone="secondary">
											Aberto em <DateTime value={ticket.createdAt} />
										</Text>
										<Button
											size="sm"
											iconEnd="arrow-right"
											href={resolve('/(app)/support/tickets/[id]', { id: ticket.id })}
											label="Responder chamado de {ticket.studentName}"
										>
											Responder
										</Button>
									</Cluster>
								</Stack>
							</Card>
						{/each}
					</Stack>
				{/if}
			</Stack>
		{/if}
	</Stack>
</Page>
