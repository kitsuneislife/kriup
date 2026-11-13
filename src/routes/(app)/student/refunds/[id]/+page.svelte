<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { refundHeadline, refundPending, refundSteps, refundStatusText } from '#lib/refund-text';
	import {
		Alert,
		Button,
		Card,
		Cluster,
		DateTime,
		formatDate,
		Message,
		Money,
		Page,
		Stack,
		StatusBadge,
		Text,
		TextField,
		Timeline
	} from '#lib/ui';

	let { data, form } = $props();

	const write = new Submission({ reset: true });
	const contest = new Submission();

	const refund = $derived(data.refund);
	const badge = $derived(refundStatusText[refund.status]);
	const headline = $derived(refundHeadline[refund.status]);
	const pending = $derived(refundPending(refund.status));
	const open = $derived(refund.status !== 'completed' && refund.status !== 'final_declined');
	const canContest = $derived(refund.status === 'declined' && !refund.contested);
</script>

<svelte:head><title>Reembolso · {data.product.name}</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={3} align="start">
			<Button variant="ghost" size="sm" icon="arrow-left" href={resolve('/(app)/student/orders')}>
				Pedidos
			</Button>
			<Cluster justify="between" gap={3}>
				<Text variant="title1" as="h1">{headline.title}</Text>
				<StatusBadge status={badge.status} label={badge.label} />
			</Cluster>
			<Text tone="secondary">{headline.body}</Text>
			<Text variant="footnote" tone="secondary">
				{data.product.name} · <Money cents={data.order.grossCents} />
			</Text>
		</Stack>

		{#if pending}
			<Card padding="lg">
				<Cluster justify="between" gap={6}>
					<Stack gap={1}>
						<Text variant="footnote" tone="secondary">Quem decide agora</Text>
						<Text weight="semibold"
							>{refund.owner === 'producer' ? 'O produtor' : 'A plataforma'}</Text
						>
					</Stack>
					<Stack gap={1}>
						<Text variant="footnote" tone="secondary">Prazo para responder</Text>
						<Text weight="semibold"><DateTime value={refund.dueAt} format="date" /></Text>
					</Stack>
				</Cluster>
			</Card>
		{/if}

		{#if canContest}
			<Alert tone="warning" title="Não concorda com a recusa?">
				Você pode contestar uma única vez. A plataforma lê o motivo, a conversa e decide em até
				alguns dias; a decisão dela é final.
				{#snippet action()}
					<form method="post" action="?/contest" use:contest.enhance>
						<Button type="submit" size="sm" loading={contest.loading('Contestando')}>
							Contestar recusa
						</Button>
					</form>
				{/snippet}
			</Alert>
		{/if}
		{#if form?.for === 'contest' && form.code}
			<Alert tone="danger">{errorText(form.code)}</Alert>
		{/if}

		<Stack gap={4}>
			<Text variant="title3" as="h2">Andamento</Text>
			<Timeline label="Etapas do reembolso" items={refundSteps(refund)} />
		</Stack>

		<Stack gap={4}>
			<Text variant="title3" as="h2">Conversa</Text>
			{#if data.messages.length === 0}
				<Text tone="secondary">
					Nenhuma mensagem ainda. Se quiser acrescentar algo ao seu pedido, escreva abaixo.
				</Text>
			{:else}
				<Stack gap={3}>
					{#each data.messages as message (message.id)}
						<Message
							author={message.authorId === data.userId ? 'Você' : message.authorName}
							time={formatDate(message.createdAt, 'datetime')}
							own={message.authorId === data.userId}
						>
							{message.body}
						</Message>
					{/each}
				</Stack>
			{/if}

			{#if open}
				<form method="post" action="?/message" use:write.enhance>
					<Stack gap={3}>
						<TextField
							name="body"
							label="Sua mensagem"
							rows={3}
							required
							error={form?.for === 'message' && form.code ? errorText(form.code) : undefined}
						/>
						<Cluster>
							<Button type="submit" icon="send" loading={write.loading('Enviando')}>Enviar</Button>
						</Cluster>
					</Stack>
				</form>
			{:else}
				<Text variant="footnote" tone="secondary">Este pedido foi encerrado.</Text>
			{/if}
		</Stack>
	</Stack>
</Page>
