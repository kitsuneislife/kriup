<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Badge,
		Button,
		Card,
		Cluster,
		EmptyState,
		Grid,
		Page,
		Progress,
		Stack,
		Text
	} from '#lib/ui';
	import { percent, progressText } from './progress';

	let { data } = $props();

	/** What the button offers: start, pick up where it stopped, or go back to a finished course. */
	function action(done: number, total: number) {
		if (total > 0 && done === total) return 'Rever aulas';
		return done === 0 ? 'Começar' : 'Continuar';
	}
</script>

<svelte:head><title>Meus cursos</title></svelte:head>

<Page>
	<Stack gap={8}>
		<Text variant="title1" as="h1">Meus cursos</Text>

		{#if data.products.length === 0}
			<EmptyState icon="book" title="Você ainda não tem cursos">
				Quando você comprar um curso, ele aparece aqui, com as aulas e o seu progresso.
			</EmptyState>
		{:else}
			<Grid as="ul" min="md" gap={4}>
				{#each data.products as product (product.id)}
					{@const done = product.completedCount}
					{@const total = product.lessonCount}
					{@const finished = total > 0 && done === total}
					<Card as="li" padding="lg">
						<Stack gap={6}>
							<Cluster justify="between" gap={3} wrap={false}>
								<Text variant="title3" as="h2" truncate>{product.name}</Text>
								{#if finished}<Badge tone="success" dot>Concluído</Badge>{/if}
							</Cluster>
							<Stack gap={2}>
								<Progress
									label="Progresso em {product.name}"
									value={percent(done, total)}
									tone={finished ? 'success' : 'accent'}
								/>
								<Text variant="footnote" tone="secondary" numeric>
									{progressText(done, total)}
								</Text>
							</Stack>
							<Button
								variant={finished ? 'neutral' : 'primary'}
								iconEnd="arrow-right"
								fullWidth
								href={resolve('/(app)/student/courses/[id]', { id: product.id })}
								label="{action(done, total)}: {product.name}"
							>
								{action(done, total)}
							</Button>
						</Stack>
					</Card>
				{/each}
			</Grid>
		{/if}
	</Stack>
</Page>
