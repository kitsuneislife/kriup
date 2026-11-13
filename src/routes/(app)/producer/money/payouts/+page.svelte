<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { payoutStatusText } from '#lib/payout-text';
	import {
		Alert,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		DateTime,
		Dialog,
		EmptyState,
		Money,
		Page,
		Stack,
		StatusBadge,
		Table,
		Text,
		TextField,
		formatMoney
	} from '#lib/ui';

	let { data, form } = $props();

	// without JavaScript the confirmation is a card on the page; with it, a Dialog
	let scripted = $state(false);
	onMount(() => (scripted = true));

	let open = $derived(scripted && Boolean(form?.preview));

	const review = new Submission();
	const send = new Submission();

	const preview = $derived(form?.preview);
	const blocked = $derived(data.blocks.length > 0);
	const negative = $derived(data.refusal === 'negative_balance');
	const canRequest = $derived(!blocked && !negative);

	const columns: {
		key: 'createdAt' | 'amountCents' | 'feeCents' | 'receivedCents' | 'status' | 'decidedAt';
		header: string;
		align?: 'end';
	}[] = [
		{ key: 'createdAt', header: 'Pedido em' },
		{ key: 'amountCents', header: 'Valor', align: 'end' },
		{ key: 'feeCents', header: 'Taxa', align: 'end' },
		{ key: 'receivedCents', header: 'Você recebe', align: 'end' },
		{ key: 'status', header: 'Situação' },
		{ key: 'decidedAt', header: 'Decidido em' }
	];
	const rows = $derived(
		data.payouts.map((p) => ({ ...p, receivedCents: p.amountCents - p.feeCents }))
	);
</script>

<svelte:head><title>Saques</title></svelte:head>

{#snippet summary(amountCents: number, feeCents: number, receivedCents: number)}
	<Stack gap={3}>
		<Cluster justify="between" gap={3}>
			<Text tone="secondary">Valor do saque</Text>
			<Money cents={amountCents} weight="semibold" />
		</Cluster>
		<Cluster justify="between" gap={3}>
			<Text tone="secondary">Taxa de saque</Text>
			<Money cents={-feeCents} tone="secondary" />
		</Cluster>
		<Cluster justify="between" gap={3}>
			<Text weight="semibold">Você recebe</Text>
			<Money cents={receivedCents} weight="semibold" tone="success" />
		</Cluster>
		<Text variant="footnote" tone="secondary">
			A taxa sai do valor sacado. O dinheiro sai do saldo liberado agora e o suporte confirma a
			transferência.
		</Text>
	</Stack>
{/snippet}

{#snippet confirmForm(amountCents: number)}
	<form method="post" action="?/confirm" use:send.enhance>
		<Button
			type="submit"
			name="amountCents"
			value={String(amountCents)}
			variant="primary"
			loading={send.loading('Solicitando')}
		>
			Confirmar saque
		</Button>
	</form>
{/snippet}

<Page>
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[{ label: 'Dinheiro', href: resolve('/(app)/producer/money') }, { label: 'Saques' }]}
			/>
			<Text variant="title1" as="h1">Saques</Text>
		</Stack>

		{#if data.requested}
			<Alert tone="success" title="Saque solicitado">
				O valor saiu do seu saldo liberado e o pedido está em análise. Ele aparece no histórico
				abaixo.
			</Alert>
		{/if}

		{#each data.blocks as block (block.id)}
			<Alert tone="danger" title="Seu saldo está bloqueado pelo suporte">
				<Stack gap={1}>
					<Text>{block.reason}</Text>
					<Text tone="secondary">O que fazer: {block.nextStep}</Text>
				</Stack>
			</Alert>
		{/each}
		{#if negative}
			<Alert tone="warning" title="Saque indisponível">{errorText('negative_balance')}</Alert>
		{/if}

		<Card padding="lg">
			<Stack gap={6}>
				<Stack gap={1}>
					<Text variant="footnote" tone="secondary">Saldo liberado para saque</Text>
					<Money cents={data.releasedCents} variant="title1" weight="semibold" />
					<Text variant="footnote" tone="secondary">
						Mínimo de {formatMoney(data.minCents)} por saque. Só o saldo liberado pode ser sacado.
					</Text>
				</Stack>

				{#if canRequest}
					<form method="post" action="?/preview" use:review.enhance>
						<Stack gap={4}>
							<TextField
								name="amount"
								label="Quanto você quer sacar?"
								hint="Em reais, como 150,00. A taxa aparece antes de você confirmar."
								inputmode="decimal"
								autocomplete="off"
								value={form?.amount ?? ''}
								error={form?.fields?.amount}
								required
							/>
							{#if form?.code && !form.fields && form.code !== 'invalid_input'}
								<Alert tone="danger">{errorText(form.code)}</Alert>
							{/if}
							<div>
								<Button
									type="submit"
									variant="primary"
									icon="wallet"
									loading={review.loading('Calculando')}
								>
									Sacar
								</Button>
							</div>
						</Stack>
					</form>
				{/if}
			</Stack>
		</Card>

		{#if preview && !scripted}
			<Card padding="lg">
				<Stack gap={4}>
					<Text variant="title3" as="h2">Confirmar saque</Text>
					{@render summary(preview.amountCents, preview.feeCents, preview.receivedCents)}
					<Cluster gap={3}>
						{@render confirmForm(preview.amountCents)}
						<Button href="?">Cancelar</Button>
					</Cluster>
				</Stack>
			</Card>
		{/if}

		{#if form?.code && form.code !== 'invalid_input' && !preview && !form.amount}
			<Alert tone="danger">{errorText(form.code)}</Alert>
		{/if}

		<Stack gap={3}>
			<Text variant="title2" as="h2">Histórico</Text>
			<Table caption="Histórico de saques" {columns} {rows} rowKey={(row) => row.id}>
				{#snippet cell(row, column)}
					{#if column.key === 'createdAt'}
						<DateTime value={row.createdAt} />
					{:else if column.key === 'decidedAt'}
						{#if row.decidedAt}<DateTime value={row.decidedAt} />{:else}<Text tone="secondary">
								Aguardando
							</Text>{/if}
					{:else if column.key === 'status'}
						{@const text = payoutStatusText[row.status]}
						<StatusBadge status={text.status} label={text.label} size="sm" />
					{:else if column.key === 'feeCents'}
						<Money cents={row.feeCents} tone="secondary" />
					{:else}
						<Money cents={column.key === 'amountCents' ? row.amountCents : row.receivedCents} />
					{/if}
				{/snippet}
				{#snippet empty()}
					<EmptyState icon="wallet" title="Nenhum saque ainda">
						Quando você sacar, o pedido aparece aqui com a taxa e a situação.
					</EmptyState>
				{/snippet}
			</Table>
		</Stack>
	</Stack>
</Page>

{#if scripted}
	<Dialog bind:open title="Confirmar saque" closeLabel="Fechar">
		{#if preview}{@render summary(
				preview.amountCents,
				preview.feeCents,
				preview.receivedCents
			)}{/if}
		{#snippet footer()}
			<Button onclick={() => (open = false)}>Cancelar</Button>
			{#if preview}{@render confirmForm(preview.amountCents)}{/if}
		{/snippet}
	</Dialog>
{/if}
