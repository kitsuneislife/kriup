<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		escalationText,
		refundStatusText,
		refundSteps,
		supportCanDecide,
		supportDeadline,
		supportRefundHeadline
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
	const badge = $derived(refundStatusText[refund.status]);
	const headline = $derived(supportRefundHeadline(refund));
	const deadline = $derived(supportDeadline(refund.dueAt, data.now));
	const canDecide = $derived(supportCanDecide(refund));
	const open = $derived(refund.status !== 'completed' && refund.status !== 'final_declined');
	const failed = (target: string) => (form?.for === target && form.code ? form.code : undefined);
	// a blank reason fails the schema first, so it always arrives as a field error
	const declineError = $derived(form?.for === 'decline' ? form.fields?.reason : undefined);
	const declineAlert = $derived(
		failed('decline') && !declineError ? errorText(failed('decline')!) : undefined
	);
	const here = $derived(resolve('/(app)/support/refunds/[id]', { id: refund.id }));
</script>

<svelte:head><title>Reembolso · {data.student.name}</title></svelte:head>

{#snippet approveSummary()}
	<Stack gap={3}>
		<Text>
			<Money cents={data.order.grossCents} weight="semibold" /> volta para {data.student.name} pelo meio
			de pagamento, e o acesso a {data.product.name} é encerrado.
		</Text>
		<Text variant="footnote" tone="secondary">
			A venda é estornada no extrato do produtor. A decisão da plataforma é final e não pode ser
			desfeita.
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
					{ label: 'Fila do suporte', href: resolve('/(app)/support') },
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
		</Stack>

		{#if form?.for === 'approve' && !form.code}
			<Alert tone="success" title="Reembolso aprovado">
				O aluno e o produtor veem a decisão no pedido, e a venda é estornada no extrato do produtor.
			</Alert>
		{:else if form?.for === 'decline' && !form.code}
			<Alert tone="success" title="Recusa registrada">
				O aluno e o produtor já podem ler a justificativa. A venda continua valendo.
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
						<Text variant="title3" as="h2">Decisão da plataforma</Text>
						<Text variant="footnote" tone="secondary">{escalationText(refund.contested)}</Text>
						<Text variant="footnote" tone={deadline.tone}>
							<strong>{deadline.label}</strong> · decida até <DateTime value={refund.dueAt} />
						</Text>
					</Stack>

					<Stack gap={3}>
						<Text tone="secondary">
							Aprovar devolve o valor ao aluno, encerra o acesso dele e estorna a venda do produtor.
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
								hint="O aluno e o produtor leem este texto. A recusa da plataforma é final: o aluno não pode contestar de novo."
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
			<Timeline label="Etapas do reembolso" items={refundSteps(refund, 'support')} />
		</Stack>

		<Stack gap={4}>
			<Text variant="title3" as="h2">Conversa</Text>
			{#if data.messages.length === 0}
				<Text tone="secondary">
					Nenhuma mensagem ainda. Se precisar de algum detalhe, pergunte aqui: o aluno e o produtor
					leem a conversa.
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
							hint="O aluno e o produtor leem a conversa."
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

		<div>
			<Button variant="ghost" icon="arrow-left" href={resolve('/(app)/support')}>
				Voltar para a fila
			</Button>
		</div>
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
