<script lang="ts">
	import { resolve } from '$app/paths';
	import { PRODUCER_RESPONSE_DAYS, SUPPORT_RESPONSE_DAYS } from '#lib/domain/params';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { Alert, Button, Card, Cluster, Icon, Money, Page, Stack, Text, TextField } from '#lib/ui';

	let { data, form } = $props();
	const send = new Submission();

	// the screen's words, in one place
	const next = $derived(
		data.withinGuarantee
			? 'Você está dentro do prazo de garantia: o pedido é aprovado na hora, o valor volta pelo mesmo meio de pagamento e o seu acesso ao produto é encerrado.'
			: `O prazo de garantia já passou, então o produtor decide. Ele tem ${PRODUCER_RESPONSE_DAYS} dias para responder; se não responder, a plataforma decide em mais ${SUPPORT_RESPONSE_DAYS} dias. Seu acesso continua enquanto isso.`
	);
</script>

<svelte:head><title>Pedir reembolso · {data.order.productName}</title></svelte:head>

<Page width="text">
	<Stack gap={6}>
		<Stack gap={2} align="start">
			<Button variant="ghost" size="sm" icon="arrow-left" href={resolve('/(app)/student/orders')}>
				Pedidos
			</Button>
			<Text variant="title1" as="h1">Pedir reembolso</Text>
			<Cluster gap={2}>
				<Text tone="secondary">{data.order.productName} ·</Text>
				<Money cents={data.order.grossCents} weight="semibold" />
			</Cluster>
		</Stack>

		<Card padding="lg">
			<Stack gap={3}>
				<Cluster gap={2} wrap={false} align="start">
					<Text tone="secondary"><Icon name="info" size="sm" /></Text>
					<Text variant="title3" as="h2">O que acontece depois</Text>
				</Cluster>
				<Text tone="secondary">{next}</Text>
			</Stack>
		</Card>

		<form method="post" use:send.enhance>
			<Stack gap={4}>
				<TextField
					name="reason"
					label="Por que você quer o reembolso?"
					hint="Conte com calma o que aconteceu. Isso ajuda quem for responder."
					rows={5}
					value={form?.reason ?? ''}
					error={form?.fields?.reason}
					required
				/>
				{#if form?.code && form.code !== 'invalid_input'}
					<Alert tone="danger">{errorText(form.code)}</Alert>
				{/if}
				<Cluster gap={3}>
					<Button type="submit" variant="primary" loading={send.loading('Enviando')}>
						Pedir reembolso
					</Button>
					<Button href={resolve('/(app)/student/orders')}>Voltar sem pedir</Button>
				</Cluster>
			</Stack>
		</form>
	</Stack>
</Page>
