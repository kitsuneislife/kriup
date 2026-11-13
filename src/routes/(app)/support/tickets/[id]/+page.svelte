<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { ticketStatusText } from '#lib/ticket-text';
	import {
		Alert,
		Badge,
		Breadcrumb,
		Button,
		Cluster,
		DateTime,
		formatDate,
		Message,
		Page,
		Stack,
		Text,
		TextField
	} from '#lib/ui';

	let { data, form } = $props();

	let replyForm: HTMLFormElement | undefined = $state();
	// after sending, the box is empty and ready for the next line
	const reply = new Submission({
		reset: true,
		done: () => replyForm?.querySelector('textarea')?.focus()
	});
	const close = new Submission();

	const status = $derived(ticketStatusText[data.ticket.status]);
	const open = $derived(data.ticket.status === 'open');
	const errors = $derived<Record<string, string>>((form && 'fields' in form && form.fields) || {});
	const failure = $derived(
		form && 'code' in form && form.code !== 'invalid_input' ? form.code : null
	);
</script>

<svelte:head><title>{data.ticket.subject} · Suporte</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Fila do suporte', href: resolve('/(app)/support') },
					{ label: 'Chamado' }
				]}
			/>
			<Text variant="title1" as="h1">{data.ticket.subject}</Text>
			<Cluster gap={3}>
				<Badge tone={status.tone} dot>{status.label}</Badge>
				<Text variant="footnote" tone="secondary">
					{data.student.name} · {data.product.name} · aberto em
					<DateTime value={data.ticket.createdAt} />
				</Text>
			</Cluster>
		</Stack>

		{#if form && 'closed' in form}
			<Alert tone="success" title="Chamado encerrado">
				O aluno vê o chamado como fechado. Se precisar de ajuda de novo, ele abre outro.
			</Alert>
		{/if}

		<Stack gap={4}>
			{#each data.messages as message (message.id)}
				<Message
					author={message.own ? 'Você' : message.authorName}
					own={message.own}
					time={formatDate(message.createdAt, 'datetime')}
				>
					{message.body}
				</Message>
			{/each}
		</Stack>

		{#if failure}<Alert tone="danger">{errorText(failure)}</Alert>{/if}

		{#if open}
			<form method="post" action="?/send" bind:this={replyForm} use:reply.enhance>
				<Stack gap={4}>
					<TextField
						name="body"
						label="Sua resposta"
						rows={4}
						hint="O aluno lê a resposta no chamado dele."
						value={form && 'typed' in form ? (form.typed ?? '') : ''}
						error={errors.body}
					/>
					<Cluster>
						<Button type="submit" variant="primary" icon="send" loading={reply.loading('Enviando')}>
							Enviar resposta
						</Button>
					</Cluster>
				</Stack>
			</form>
			<form method="post" action="?/close" use:close.enhance>
				<Stack gap={2}>
					<Text variant="footnote" tone="secondary">
						Resolvido? Encerre o chamado. Depois de encerrado, ele não recebe mais mensagens.
					</Text>
					<Cluster>
						<Button type="submit" loading={close.loading('Encerrando')}>Encerrar chamado</Button>
					</Cluster>
				</Stack>
			</form>
		{:else}
			<Alert tone="info">
				Este chamado está fechado{#if data.ticket.closedAt}
					desde <DateTime value={data.ticket.closedAt} />{/if} e não recebe mais mensagens.
			</Alert>
		{/if}

		<div>
			<Button variant="ghost" icon="arrow-left" href={resolve('/(app)/support')}>
				Voltar para a fila
			</Button>
		</div>
	</Stack>
</Page>
