<script lang="ts">
	import {
		Alert,
		Card,
		DateTime,
		EmptyState,
		Grid,
		Money,
		Page,
		Stack,
		Stat,
		Text,
		Timeline,
		formatDate,
		formatMoney
	} from '#lib/ui';

	let { data } = $props();
	const panel = $derived(data.panel);
	const balance = $derived(panel.balance);
	const empty = $derived(
		panel.releases.length === 0 &&
			balance.releasedCents === 0 &&
			balance.paidOutCents === 0 &&
			panel.blocks.length === 0
	);

	const blockTitle = { account: 'Conta bloqueada', balance: 'Saques bloqueados' } as const;
	const plural = (n: number) => (n === 1 ? '1 venda' : `${n} vendas`);
</script>

<svelte:head><title>Dinheiro</title></svelte:head>

<Page>
	<Stack gap={8}>
		<Text variant="title1" as="h1">Dinheiro</Text>

		{#each panel.blocks as block (block.id)}
			<Alert
				tone="warning"
				title={block.target === 'account' ? blockTitle.account : blockTitle.balance}
			>
				<Stack gap={1}>
					<Text variant="subhead">Motivo: {block.reason}</Text>
					<Text variant="subhead">Para resolver: {block.nextStep}</Text>
					{#if block.endsAt}
						<Text variant="footnote" tone="secondary">
							O bloqueio termina em <DateTime value={block.endsAt} format="date" />.
						</Text>
					{/if}
				</Stack>
			</Alert>
		{/each}

		{#if empty}
			<EmptyState icon="wallet" title="Nenhum dinheiro ainda">
				Quando você fizer a primeira venda, o valor aparece aqui como retido e é liberado depois do
				prazo da garantia.
			</EmptyState>
		{:else}
			<Card padding="lg">
				<Grid min="sm" gap={6}>
					<Stat label="Retido" icon="clock" tone="warning" hint="Aguardando o fim da garantia">
						<Money cents={balance.heldCents} variant="title2" weight="semibold" />
					</Stat>
					<Stat label="Liberado" icon="check-circle" tone="success" hint="Disponível para saque">
						<Money cents={balance.releasedCents} variant="title2" weight="semibold" />
					</Stat>
					<Stat label="Sacado" icon="download" hint="Já transferido para você">
						<Money cents={balance.paidOutCents} variant="title2" weight="semibold" />
					</Stat>
				</Grid>
			</Card>

			<Stack gap={4}>
				<Text variant="title3" as="h2">Próximas liberações</Text>
				{#if panel.releases.length === 0}
					<Text tone="secondary">Nenhum valor retido agora.</Text>
				{:else}
					<Card padding="lg">
						<Timeline
							label="Próximas liberações"
							items={panel.releases.map((r) => ({
								title: formatMoney(r.amountCents),
								time: formatDate(r.releaseAt, 'date'),
								description: `Garantia de compra: ${plural(r.entries)} liberada${r.entries === 1 ? '' : 's'} quando o prazo de reembolso terminar.`,
								state: 'upcoming',
								tone: 'warning'
							}))}
						/>
					</Card>
				{/if}
			</Stack>
		{/if}

		<Stack gap={4}>
			<Text variant="title3" as="h2">Saque</Text>
			{#if panel.payout.refusal === 'negative_balance'}
				<Alert tone="danger" title="Saque indisponível: saldo negativo">
					Seu saldo liberado está negativo, por exemplo depois de um reembolso de uma venda já
					liberada. Novas vendas liberadas cobrem esse valor primeiro; só depois o saque volta a ser
					possível.
				</Alert>
			{/if}
			<Text tone="secondary">
				O saque mínimo é {formatMoney(panel.payout.minCents)} e cada saque tem taxa fixa de {formatMoney(
					panel.payout.feeCents
				)}, descontada do valor. Só o dinheiro liberado pode ser sacado.
			</Text>
		</Stack>
	</Stack>
</Page>
