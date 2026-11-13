<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { orderStatusText } from '#lib/order-text';
	import {
		Alert,
		Breadcrumb,
		Button,
		Cluster,
		EmptyState,
		formatDate,
		Page,
		Select,
		Stack,
		Text,
		TextField
	} from '#lib/ui';

	let { data, form } = $props();

	const send = new Submission();
	const errors = $derived<Record<string, string>>((form && 'fields' in form && form.fields) || {});
	const typed = $derived(form?.typed);

	const options = $derived([
		{ value: '', label: 'Escolha a compra' },
		...data.orders.map((o) => ({
			value: o.id,
			label: `${o.productName} · ${formatDate(o.createdAt, 'date')} · ${orderStatusText[o.status].label}`
		}))
	]);
</script>

<svelte:head><title>Novo chamado</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Chamados', href: resolve('/(app)/student/tickets') },
					{ label: 'Novo chamado' }
				]}
			/>
			<Text variant="title1" as="h1">Novo chamado</Text>
			<Text tone="secondary">
				Conte o que aconteceu. A equipe de suporte da plataforma responde aqui mesmo, e você pode
				acompanhar a conversa na lista de chamados.
			</Text>
		</Stack>

		{#if data.orders.length === 0}
			<EmptyState icon="receipt" title="Você ainda não tem compras">
				Um chamado fala sobre uma compra. Depois da sua primeira compra, ele pode ser aberto aqui.
			</EmptyState>
		{:else}
			<form method="post" use:send.enhance>
				<Stack gap={4}>
					{#if form && 'code' in form && form.code !== 'invalid_input'}
						<Alert tone="danger">{errorText(form.code)}</Alert>
					{/if}
					<Select
						name="orderId"
						label="Sobre qual compra?"
						required
						{options}
						value={typed?.orderId ?? data.preselected}
						error={errors.orderId}
					/>
					<TextField
						name="subject"
						label="Assunto"
						hint="Em poucas palavras. Por exemplo: Não consigo acessar as aulas."
						value={typed?.subject ?? ''}
						error={errors.subject}
					/>
					<TextField
						name="body"
						label="Mensagem"
						rows={5}
						value={typed?.body ?? ''}
						error={errors.body}
					/>
					<Cluster>
						<Button type="submit" variant="primary" loading={send.loading('Enviando')}>
							Abrir chamado
						</Button>
						<Button variant="ghost" href={resolve('/(app)/student/tickets')}>Cancelar</Button>
					</Cluster>
				</Stack>
			</form>
		{/if}
	</Stack>
</Page>
