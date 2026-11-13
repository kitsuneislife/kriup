<script lang="ts">
	import { resolve } from '$app/paths';
	import { auditActionText, auditTargetText } from '#lib/support-text';
	import { Button, Card, EmptyState, Page, Stack, Text, Timeline, formatDate } from '#lib/ui';

	let { data } = $props();

	const items = $derived(
		data.entries.map((e) => ({
			title: `${auditActionText(e.action)}: ${auditTargetText(e.target)}`,
			time: formatDate(e.createdAt, 'datetime'),
			description: e.reason ? `Por ${e.actorName} · Motivo: ${e.reason}` : `Por ${e.actorName}`
		}))
	);
</script>

<svelte:head><title>Auditoria</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={2}>
			<Text variant="title1" as="h1">Auditoria</Text>
			<Text tone="secondary">
				Cada ação do suporte, da mais recente para a mais antiga: quem fez, o quê, quando e sobre
				quem. Mostra as 100 últimas.
			</Text>
		</Stack>

		{#if items.length === 0}
			<EmptyState icon="list" title="Nenhuma ação registrada">
				Decisões de reembolso, saques, bloqueios e chamados encerrados pelo suporte aparecem aqui.
				{#snippet action()}
					<Button href={resolve('/(app)/support/blocks')}>Ver bloqueios</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<Card padding="lg">
				<Timeline label="Ações do suporte" {items} />
			</Card>
		{/if}
	</Stack>
</Page>
