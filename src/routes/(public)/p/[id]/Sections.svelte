<script lang="ts">
	// The sections of a public page as the buyer reads them (RF-13 kinds: benefits,
	// guarantee, faq, summary). The hero is drawn by the page itself, with BrandHero.
	import type { Section } from '#lib/domain/page';
	import { Card, Cluster, Disclosure, Icon, Stack, Text } from '#lib/ui';

	let { sections }: { sections: readonly Section[] } = $props();

	/** `item1`, `item2`… in their number order, empty ones left out. */
	const numbered = (fields: Section['fields'], prefix: string) =>
		Object.keys(fields)
			.map((key) => new RegExp(`^${prefix}(\\d+)$`).exec(key))
			.filter((match) => match !== null)
			.sort((a, b) => Number(a[1]) - Number(b[1]))
			.map((match) => ({ n: match[1]!, text: fields[match[0]]!.trim() }))
			.filter(({ text }) => text !== '');
</script>

{#snippet image(fields: Section['fields'])}
	{#if fields.image}
		<img class="image" src={fields.image} alt={fields.imageAlt ?? ''} loading="lazy" />
	{/if}
{/snippet}

{#each sections as section, index (index)}
	{@const fields = section.fields}
	{#if section.kind === 'benefits'}
		<Stack gap={4} as="section">
			{#if fields.title}<Text variant="title2" as="h2">{fields.title}</Text>{/if}
			{@render image(fields)}
			<Stack gap={3} as="ul">
				{#each numbered(fields, 'item') as item (item.n)}
					<li>
						<Cluster gap={3} align="start" wrap={false}>
							<span class="mark"><Icon name="check" /></span>
							<Text>{item.text}</Text>
						</Cluster>
					</li>
				{/each}
			</Stack>
		</Stack>
	{:else if section.kind === 'guarantee'}
		<Card padding="lg" as="section">
			<Cluster gap={4} align="start" wrap={false}>
				<span class="seal"><Icon name="shield" size="lg" /></span>
				<Stack gap={2}>
					{#if fields.title}<Text variant="title3" as="h2">{fields.title}</Text>{/if}
					{#if fields.text}<Text tone="secondary">{fields.text}</Text>{/if}
				</Stack>
			</Cluster>
		</Card>
	{:else if section.kind === 'faq'}
		<Stack gap={4} as="section">
			<Text variant="title2" as="h2">{fields.title || 'Perguntas frequentes'}</Text>
			<Stack gap={2}>
				{#each numbered(fields, 'question') as question (question.n)}
					<Disclosure title={question.text}>
						<Text tone="secondary">{fields[`answer${question.n}`]}</Text>
					</Disclosure>
				{/each}
			</Stack>
		</Stack>
	{:else}
		<Stack gap={3} as="section">
			{#if fields.title}<Text variant="title2" as="h2">{fields.title}</Text>{/if}
			{@render image(fields)}
			{#each ['subtitle', 'text', 'note'] as key (key)}
				{#if fields[key]}<Text tone="secondary">{fields[key]}</Text>{/if}
			{/each}
		</Stack>
	{/if}
{/each}

<style>
	.image {
		inline-size: 100%;
		border-radius: var(--radius-lg);
		box-shadow: inset 0 0 0 var(--border-width) var(--color-hairline);
	}
	.mark {
		display: inline-grid;
		place-items: center;
		flex: none;
		inline-size: var(--space-6);
		block-size: var(--space-6);
		border-radius: var(--radius-pill);
		background: var(--color-accent-tint);
		color: var(--color-accent);
	}
	.seal {
		display: inline-grid;
		place-items: center;
		flex: none;
		inline-size: var(--space-12);
		block-size: var(--space-12);
		border-radius: var(--radius-pill);
		background: var(--color-accent-tint);
		color: var(--color-accent);
	}
</style>
