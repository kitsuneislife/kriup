<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		coproductionStatusText,
		durationText,
		sharePercent,
		sortInvites
	} from '#lib/coproduction-text';
	import {
		Button,
		Card,
		Cluster,
		DateTime,
		EmptyState,
		Page,
		Stack,
		StatusBadge,
		Text
	} from '#lib/ui';

	let { data } = $props();

	const terms = $derived(sortInvites(data.terms));
</script>

<svelte:head><title>Convites de coprodução</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={2}>
			<Text variant="title1" as="h1">Convites de coprodução</Text>
			<Text tone="secondary">
				Quem convida você define a sua parte e o prazo. Leia o contrato e aceite para começar a
				receber das vendas.
			</Text>
		</Stack>

		{#if terms.length === 0}
			<EmptyState icon="users" title="Nenhum convite ainda">
				Quando um produtor convidar você para coproduzir, o convite aparece aqui com o contrato para
				ler e aceitar.
			</EmptyState>
		{:else}
			<Stack gap={4} as="ul">
				{#each terms as term (term.id)}
					{@const badge = coproductionStatusText[term.status]}
					{@const pending = term.status === 'invited'}
					<Card as="li" padding="lg">
						<Stack gap={4}>
							<Cluster justify="between" gap={3}>
								<Stack gap={1}>
									<Text weight="semibold" as="h2">{term.productName}</Text>
									<Text variant="footnote" tone="secondary">
										{sharePercent(term.percentBp)} do valor líquido · {durationText(
											term.durationDays
										)}
									</Text>
								</Stack>
								<StatusBadge status={badge.status} label={badge.label} size="sm" />
							</Cluster>
							<Cluster justify="between" gap={3}>
								<Text variant="footnote" tone="secondary">
									{#if term.acceptedAt}
										Aceito em <DateTime value={term.acceptedAt} format="date" />
										{#if term.endsAt}· até <DateTime value={term.endsAt} format="date" />{/if}
									{:else}
										Convite de <DateTime value={term.createdAt} format="date" />
									{/if}
								</Text>
								<Button
									size="sm"
									variant={pending ? 'primary' : 'ghost'}
									iconEnd="arrow-right"
									href={resolve('/(app)/coproductions/[id]', { id: term.id })}
									label="{pending ? 'Ler e responder' : 'Ver contrato'} de {term.productName}"
								>
									{pending ? 'Ler e responder' : 'Ver contrato'}
								</Button>
							</Cluster>
						</Stack>
					</Card>
				{/each}
			</Stack>
		{/if}
	</Stack>
</Page>
