<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		Alert,
		Button,
		Card,
		Cluster,
		DateTime,
		Dialog,
		EmptyState,
		Money,
		Page,
		Stack,
		Text,
		TextField
	} from '#lib/ui';

	let { data, form } = $props();

	type Payout = (typeof data.payouts)[number];
	type Kind = 'complete' | 'decline';

	// without JavaScript the confirmation is a card under the payout (`?complete=` or
	// `?decline=`); with it, a Dialog
	let scripted = $state(false);
	onMount(() => (scripted = true));

	let open = $state(false);
	let chosen = $state<{ id: string; kind: Kind }>();
	const choose = (id: string, kind: Kind) => {
		chosen = { id, kind };
		open = true;
	};
	// a refusal keeps the Dialog open with the error; a success redirects and closes it
	const settle = () => {
		if (!form?.code) open = false;
	};
	const complete = new Submission({ done: settle });
	const decline = new Submission({ done: settle });

	const here = resolve('/(app)/support/payouts');

	/** The payout whose confirmation shows on the page, without JavaScript. */
	const focus = $derived.by((): { id: string; kind: Kind } | undefined => {
		if (form?.for) return { id: form.for, kind: form.kind };
		if (data.completing) return { id: data.completing, kind: 'complete' };
		if (data.declining) return { id: data.declining, kind: 'decline' };
		return undefined;
	});
	const chosenPayout = $derived(data.payouts.find((p) => p.id === chosen?.id));

	const failedOn = (id: string) => (form?.for === id ? form : undefined);
	const reasonError = (id: string) => failedOn(id)?.fields?.reason;
	/** A refusal that is not the reason field's: the payout changed meanwhile. */
	const alertOf = (id: string) => {
		const failed = failedOn(id);
		return failed?.code && !failed.fields?.reason ? errorText(failed.code) : undefined;
	};
</script>

<svelte:head><title>Saques</title></svelte:head>

{#snippet completeSummary(p: Payout)}
	<Stack gap={3}>
		<Text>
			Transfira <Money cents={p.amountCents - p.feeCents} weight="semibold" /> para a conta de
			{p.userName} e depois conclua.
		</Text>
		<Text variant="footnote" tone="secondary">
			O produtor passa a ver o saque como Concluído. Esta decisão não pode ser desfeita.
		</Text>
	</Stack>
{/snippet}

{#snippet completeForm(p: Payout)}
	<form method="post" action="?/complete" use:complete.enhance>
		<Button
			type="submit"
			name="id"
			value={p.id}
			variant="primary"
			icon="check"
			loading={complete.loading('Concluindo')}
		>
			Concluir saque
		</Button>
	</form>
{/snippet}

{#snippet completeFooter()}
	{#if chosenPayout}
		<Button onclick={() => (open = false)}>Cancelar</Button>
		{@render completeForm(chosenPayout)}
	{/if}
{/snippet}

{#snippet declineForm(p: Payout, cancel: () => void, cancelHref?: string)}
	<form method="post" action="?/decline" use:decline.enhance>
		<Stack gap={4}>
			<Text tone="secondary">
				<Money cents={p.amountCents} weight="semibold" /> volta ao saldo liberado de {p.userName},
				que lê o motivo no histórico de saques.
			</Text>
			<TextField
				name="reason"
				label="Motivo da recusa"
				hint="O produtor lê este texto. Diga o que ele precisa corrigir para sacar de novo."
				rows={3}
				required
				value={failedOn(p.id)?.reason ?? ''}
				error={reasonError(p.id)}
			/>
			{#if alertOf(p.id)}<Alert tone="danger">{alertOf(p.id)}</Alert>{/if}
			<Cluster gap={3} justify="end">
				{#if cancelHref}
					<Button href={cancelHref}>Cancelar</Button>
				{:else}
					<Button onclick={cancel}>Cancelar</Button>
				{/if}
				<Button
					type="submit"
					name="id"
					value={p.id}
					variant="danger"
					loading={decline.loading('Recusando')}
				>
					Recusar saque
				</Button>
			</Cluster>
		</Stack>
	</form>
{/snippet}

<Page>
	<Stack gap={8}>
		<Stack gap={2}>
			<Text variant="title1" as="h1">Saques</Text>
			<Text tone="secondary">
				Pedidos dos produtores esperando a transferência, do mais antigo ao mais novo. Conclua
				depois de transferir o valor líquido, ou recuse com o motivo e o valor volta ao saldo.
			</Text>
		</Stack>

		{#if data.done === 'completed'}
			<Alert tone="success" title="Saque concluído">
				O produtor já vê o saque como Concluído no histórico dele.
			</Alert>
		{:else if data.done === 'declined'}
			<Alert tone="success" title="Saque recusado">
				O valor voltou ao saldo liberado do produtor, que vê o motivo no histórico de saques.
			</Alert>
		{/if}

		{#if data.payouts.length === 0}
			<EmptyState icon="wallet" title="Nenhum saque esperando">
				Quando um produtor pedir um saque, ele aparece aqui para você concluir ou recusar.
			</EmptyState>
		{:else}
			<Stack as="ul" gap={4}>
				{#each data.payouts as p (p.id)}
					<Card as="li" padding="lg">
						<Stack gap={4}>
							<Cluster justify="between" align="start" gap={3}>
								<Stack gap={1}>
									<Text weight="semibold">{p.userName}</Text>
									<Text variant="footnote" tone="secondary">{p.userEmail}</Text>
								</Stack>
								<Text variant="footnote" tone="secondary">
									Pedido em <DateTime value={p.createdAt} />
								</Text>
							</Cluster>

							<Cluster gap={6}>
								<Stack gap={1}>
									<Text variant="footnote" tone="secondary">Valor</Text>
									<Money cents={p.amountCents} />
								</Stack>
								<Stack gap={1}>
									<Text variant="footnote" tone="secondary">Taxa</Text>
									<Money cents={p.feeCents} tone="secondary" />
								</Stack>
								<Stack gap={1}>
									<Text variant="footnote" tone="secondary">Líquido a transferir</Text>
									<Money cents={p.amountCents - p.feeCents} weight="semibold" />
								</Stack>
							</Cluster>

							{#if scripted}
								<Cluster gap={3}>
									<Button icon="check" onclick={() => choose(p.id, 'complete')}>Concluir</Button>
									<Button variant="ghost" onclick={() => choose(p.id, 'decline')}>Recusar</Button>
								</Cluster>
								{#if alertOf(p.id) && !open}<Alert tone="danger">{alertOf(p.id)}</Alert>{/if}
							{:else if focus?.id === p.id && focus.kind === 'complete'}
								<Card variant="frame" padding="lg">
									<Stack gap={4}>
										<Text variant="title3" as="h2">Concluir saque</Text>
										{@render completeSummary(p)}
										{#if alertOf(p.id)}<Alert tone="danger">{alertOf(p.id)}</Alert>{/if}
										<Cluster gap={3}>
											{@render completeForm(p)}
											<Button href={here}>Cancelar</Button>
										</Cluster>
									</Stack>
								</Card>
							{:else if focus?.id === p.id && focus.kind === 'decline'}
								<Card variant="frame" padding="lg">
									<Stack gap={4}>
										<Text variant="title3" as="h2">Recusar saque</Text>
										{@render declineForm(p, () => {}, here)}
									</Stack>
								</Card>
							{:else}
								<Cluster gap={3}>
									<Button icon="check" href="{here}?complete={p.id}">Concluir</Button>
									<Button variant="ghost" href="{here}?decline={p.id}">Recusar</Button>
								</Cluster>
							{/if}
						</Stack>
					</Card>
				{/each}
			</Stack>
		{/if}
	</Stack>
</Page>

{#if scripted}
	<Dialog
		bind:open
		title={chosen?.kind === 'decline' ? 'Recusar saque' : 'Concluir saque'}
		closeLabel="Fechar"
		footer={chosen?.kind === 'complete' ? completeFooter : undefined}
	>
		{#if chosenPayout && chosen?.kind === 'complete'}
			{@render completeSummary(chosenPayout)}
			{#if alertOf(chosenPayout.id)}<Alert tone="danger">{alertOf(chosenPayout.id)}</Alert>{/if}
		{:else if chosenPayout}
			{@render declineForm(chosenPayout, () => (open = false))}
		{/if}
	</Dialog>
{/if}
