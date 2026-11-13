<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		producerCanDecide,
		producerDeadline,
		producerRefundHeadline,
		producerRefundStatus,
		refundSteps
	} from '#lib/refund-text';
	import {
		Alert,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		DateTime,
		Dialog,
		Divider,
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

	// without JavaScript the approval is confirmed on a card (`?approve`); with it, a Dialog
	let scripted = $state(false);
	onMount(() => (scripted = true));
	let confirming = $state(false);

	const approve = new Submission({ done: () => (confirming = false) });
	const decline = new Submission();
	const write = new Submission({ reset: true });

	const refund = $derived(data.refund);
	const badge = $derived(producerRefundStatus(refund, data.now));
	const headline = $derived(producerRefundHeadline(refund, data.now));
	const deadline = $derived(producerDeadline(refund.dueAt, data.now));
	const canDecide = $derived(producerCanDecide(refund, data.now));
	const open = $derived(refund.status !== 'completed' && refund.status !== 'final_declined');
	const failed = (target: string) => (form?.for === target && form.code ? form.code : undefined);
	const declineError = $derived(
		form?.for === 'decline' && form.code
			? (form.fields?.reason ??
					(form.code === 'decline_reason_required' ? errorText(form.code) : undefined))
			: undefined
	);
	const declineAlert = $derived(
		failed('decline') && !declineError ? errorText(failed('decline')!) : undefined
	);
	const here = $derived(resolve('/(app)/producer/refunds/[id]', { id: refund.id }));
</script>

<svelte:head><title>Reembolso · {data.student.name}</title></svelte:head>

{#snippet approveSummary()}
	<Stack gap={3}>
		<Text>
			<Money cents={data.order.grossCents} weight="semibold" /> volta para {data.student.name} pelo meio
			de pagamento, e o acesso a {data.product.name} é encerrado.
		</Text>
		<Text variant="footnote" tone="secondary">
			A venda é estornada no seu extrato. Esta decisão não pode ser desfeita.
		</Text>
	</Stack>
{/snippet}

{#snippet approveForm()}
	<form method="post" action="?/approve" use:approve.enhance>
		<Button type="submit" variant="primary" icon="check" loading={approve.loading('Aprovando')}>
			Aprovar e devolver
		</Button>
	</form>
{/snippet}

<Page width="text">
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Reembolsos', href: resolve('/(app)/producer/refunds') },
					{ label: data.student.name }
				]}
			/>
			<Cluster justify="between" gap={3}>
				<Text variant="title1" as="h1">{headline.title}</Text>
				<StatusBadge status={badge.status} label={badge.label} />
			</Cluster>
			<Text tone="secondary">{headline.body}</Text>
			<Text variant="footnote" tone="secondary">
				{data.student.name} · {data.product.name} · <Money
					cents={data.order.grossCents}
					variant="footnote"
				/>
				{#if data.order.paidAt}· pago em <DateTime value={data.order.paidAt} format="date" />{/if}
			</Text>
			{#if refund.status === 'completed'}
				<Button
					variant="ghost"
					size="sm"
					iconEnd="arrow-right"
					href={resolve('/(app)/producer/money/statement')}
				>
					Ver no extrato
				</Button>
			{/if}
		</Stack>

		{#if form?.for === 'approve' && !form.code}
			<Alert tone="success" title="Reembolso aprovado">
				O aluno vê a decisão no pedido dele, e a venda aparece como estornada no extrato.
			</Alert>
		{:else if form?.for === 'decline' && !form.code}
			<Alert tone="success" title="Recusa enviada">
				O aluno já pode ler a sua justificativa. Se ele contestar, a plataforma decide.
			</Alert>
		{/if}

		<Card padding="lg">
			<Stack gap={2}>
				<Text variant="footnote" tone="secondary">
					Motivo de {data.student.name}, em <DateTime value={refund.openedAt} />
				</Text>
				<Text>{refund.reason}</Text>
			</Stack>
		</Card>

		{#if canDecide}
			<Card padding="lg">
				<Stack gap={6}>
					<Stack gap={1}>
						<Text variant="title3" as="h2">Sua decisão</Text>
						<Text variant="footnote" tone={deadline.tone}>
							<strong>{deadline.label}</strong> · responda até <DateTime value={refund.dueAt} />
						</Text>
					</Stack>

					<Stack gap={3}>
						<Text tone="secondary">
							Aprovar devolve o valor ao aluno e encerra o acesso dele ao produto.
						</Text>
						<div>
							{#if scripted}
								<Button variant="primary" icon="check" onclick={() => (confirming = true)}>
									Aprovar reembolso
								</Button>
							{:else}
								<Button variant="primary" icon="check" href="{here}?approve">
									Aprovar reembolso
								</Button>
							{/if}
						</div>
						{#if data.confirming && !scripted}
							<Card variant="frame" padding="lg">
								<Stack gap={4}>
									<Text variant="title3" as="h3">Confirmar aprovação</Text>
									{@render approveSummary()}
									<Cluster gap={3}>
										{@render approveForm()}
										<Button href={here}>Cancelar</Button>
									</Cluster>
								</Stack>
							</Card>
						{/if}
						{#if failed('approve')}
							<Alert tone="danger">{errorText(failed('approve')!)}</Alert>
						{/if}
					</Stack>

					<Divider />

					<form method="post" action="?/decline" use:decline.enhance>
						<Stack gap={3}>
							<TextField
								name="reason"
								label="Justificativa da recusa"
								hint="O aluno lê este texto e pode contestar uma vez; aí a plataforma decide. Explique com clareza o que foi entregue."
								rows={4}
								required
								value={form?.for === 'decline' ? (form.typed?.reason ?? '') : ''}
								error={declineError}
							/>
							{#if declineAlert}<Alert tone="danger">{declineAlert}</Alert>{/if}
							<div>
								<Button type="submit" variant="danger" loading={decline.loading('Recusando')}>
									Recusar reembolso
								</Button>
							</div>
						</Stack>
					</form>
				</Stack>
			</Card>
		{/if}

		<Stack gap={4}>
			<Text variant="title3" as="h2">Andamento</Text>
			<Timeline label="Etapas do reembolso" items={refundSteps(refund, 'producer')} />
		</Stack>

		<Stack gap={4}>
			<Text variant="title3" as="h2">Conversa</Text>
			{#if data.messages.length === 0}
				<Text tone="secondary">
					Nenhuma mensagem ainda. Se precisar de algum detalhe do aluno, pergunte aqui.
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
							hint="O aluno e a plataforma leem a conversa."
							rows={3}
							required
							value={form?.for === 'message' ? (form.typed?.body ?? '') : ''}
							error={failed('message') ? errorText(failed('message')!) : undefined}
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

{#if scripted}
	<Dialog bind:open={confirming} title="Aprovar reembolso?" closeLabel="Fechar">
		{@render approveSummary()}
		{#snippet footer()}
			<Button onclick={() => (confirming = false)}>Cancelar</Button>
			{@render approveForm()}
		{/snippet}
	</Dialog>
{/if}
