<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import {
		coproductionHeadline,
		coproductionStatusText,
		durationText,
		sharePercent
	} from '#lib/coproduction-text';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		Alert,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		DateTime,
		Dialog,
		Divider,
		Page,
		Stack,
		StatusBadge,
		Text
	} from '#lib/ui';

	let { data, form } = $props();

	// without JavaScript the answer is confirmed on a card (`?accept`, `?refuse`); with it, a Dialog
	let scripted = $state(false);
	onMount(() => (scripted = true));
	let asking = $state<'accept' | 'refuse' | null>(null);

	const accept = new Submission({ done: () => (asking = null) });
	const decline = new Submission({ done: () => (asking = null) });

	const contract = $derived(data.contract);
	const badge = $derived(coproductionStatusText[contract.status]);
	const headline = $derived(coproductionHeadline[contract.status]);
	const pending = $derived(contract.status === 'invited');
	const lines = $derived(contract.contractText.split('\n'));
	const failed = (target: string) => (form?.for === target && form.code ? form.code : undefined);
	const failure = $derived(failed('accept') ?? failed('refuse'));
	const here = $derived(resolve('/(app)/coproductions/[id]', { id: contract.id }));
</script>

<svelte:head><title>Contrato · {contract.productName}</title></svelte:head>

{#snippet summary(kind: 'accept' | 'refuse')}
	<Stack gap={3}>
		{#if kind === 'accept'}
			<Text>
				Você passa a receber {sharePercent(contract.percentBp)} do valor líquido das vendas de
				{contract.productName}, {durationText(contract.durationDays).toLowerCase()}. Vale só para
				vendas pagas depois do aceite.
			</Text>
			<Text variant="footnote" tone="secondary">
				O aceite fica registrado com a versão {contract.contractVersion} do texto e não pode ser desfeito.
			</Text>
		{:else}
			<Text>
				O convite de {contract.productName} é cancelado. Para voltar a receber, o produtor precisa enviar
				um novo convite.
			</Text>
		{/if}
	</Stack>
{/snippet}

{#snippet answerForm(kind: 'accept' | 'refuse')}
	{#if kind === 'accept'}
		<form method="post" action="?/accept" use:accept.enhance>
			<Button type="submit" variant="primary" icon="check" loading={accept.loading('Aceitando')}>
				Aceitar contrato
			</Button>
		</form>
	{:else}
		<form method="post" action="?/refuse" use:decline.enhance>
			<Button type="submit" variant="danger" loading={decline.loading('Recusando')}>
				Recusar convite
			</Button>
		</form>
	{/if}
{/snippet}

<Page width="text">
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Convites', href: resolve('/(app)/coproductions') },
					{ label: contract.productName }
				]}
			/>
			<Cluster justify="between" gap={3}>
				<Text variant="title1" as="h1">{headline.title}</Text>
				<StatusBadge status={badge.status} label={badge.label} />
			</Cluster>
			<Text tone="secondary">{headline.body}</Text>
		</Stack>

		{#if form?.for === 'accept' && !form.code}
			<Alert tone="success" title="Contrato aceito">
				A sua parte das vendas pagas a partir de agora aparece no extrato.
			</Alert>
		{:else if form?.for === 'refuse' && !form.code}
			<Alert tone="success" title="Convite recusado">
				O produtor vê que o convite foi cancelado. Nenhuma venda foi dividida.
			</Alert>
		{:else if failure}
			<Alert tone="danger">{errorText(failure)}</Alert>
		{/if}

		<Card padding="lg">
			<Stack gap={3}>
				<Text variant="title3" as="h2">Termos</Text>
				<Stack gap={2}>
					<Text>Produto: <strong>{contract.productName}</strong></Text>
					<Text>
						Sua parte: <strong>{sharePercent(contract.percentBp)}</strong> do valor líquido de cada venda
					</Text>
					<Text>Duração: {durationText(contract.durationDays)}</Text>
					<Text>Versão do contrato: {contract.contractVersion}</Text>
					<Text variant="footnote" tone="secondary">
						Convite de <DateTime value={contract.createdAt} format="date" />
					</Text>
				</Stack>
			</Stack>
		</Card>

		<Stack gap={3}>
			<Text variant="title3" as="h2">Contrato</Text>
			<Card variant="frame" padding="lg">
				<Stack gap={2}>
					{#each lines as line, i (i)}
						{#if line === ''}
							<Divider />
						{:else}
							<Text variant={i === 0 ? 'title3' : 'body'} as={i === 0 ? 'h3' : 'p'}>{line}</Text>
						{/if}
					{/each}
				</Stack>
			</Card>
		</Stack>

		{#if pending}
			<Card padding="lg">
				<Stack gap={4}>
					<Stack gap={1}>
						<Text variant="title3" as="h2">Sua resposta</Text>
						<Text tone="secondary">
							Aceitar começa a valer agora, só para vendas pagas depois. Recusar cancela o convite.
						</Text>
					</Stack>
					<Cluster gap={3}>
						{#if scripted}
							<Button variant="primary" icon="check" onclick={() => (asking = 'accept')}>
								Aceitar contrato
							</Button>
							<Button onclick={() => (asking = 'refuse')}>Recusar convite</Button>
						{:else}
							<Button variant="primary" icon="check" href="{here}?accept">Aceitar contrato</Button>
							<Button href="{here}?refuse">Recusar convite</Button>
						{/if}
					</Cluster>
					{#if data.confirming && !scripted}
						<Card variant="frame" padding="lg">
							<Stack gap={4}>
								<Text variant="title3" as="h3">
									{data.confirming === 'accept' ? 'Confirmar aceite' : 'Confirmar recusa'}
								</Text>
								{@render summary(data.confirming as 'accept' | 'refuse')}
								<Cluster gap={3}>
									{@render answerForm(data.confirming as 'accept' | 'refuse')}
									<Button href={here}>Voltar</Button>
								</Cluster>
							</Stack>
						</Card>
					{/if}
				</Stack>
			</Card>
		{:else if contract.acceptedAt}
			<Card padding="lg">
				<Stack gap={3}>
					<Text variant="title3" as="h2">Aceite</Text>
					<Text>
						Aceito em <DateTime value={contract.acceptedAt} format="datetime" />, na versão {contract.contractVersion}
						do contrato.
					</Text>
					{#if contract.endsAt}
						<Text tone="secondary">
							{contract.status === 'active' ? 'Vale até' : 'Terminou em'}
							<DateTime value={contract.endsAt} format="date" />.
						</Text>
					{/if}
					{#if contract.acceptance}
						<Text variant="footnote" tone="secondary">
							Registro do aceite: {contract.acceptance.textHash.slice(0, 12)}
						</Text>
					{/if}
					<div>
						<Button iconEnd="arrow-right" href={resolve('/(app)/producer/money/statement')}>
							Ver a minha parte no extrato
						</Button>
					</div>
				</Stack>
			</Card>
		{/if}
	</Stack>
</Page>

{#if scripted && pending}
	<Dialog
		bind:open={() => asking !== null, (open) => (asking = open ? asking : null)}
		title={asking === 'refuse' ? 'Recusar o convite?' : 'Aceitar o contrato?'}
		closeLabel="Fechar"
	>
		{#if asking}{@render summary(asking)}{/if}
		{#snippet footer()}
			<Button onclick={() => (asking = null)}>Voltar</Button>
			{#if asking}{@render answerForm(asking)}{/if}
		{/snippet}
	</Dialog>
{/if}
