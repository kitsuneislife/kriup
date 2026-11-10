<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** Anchor of the section, also the scroll target of the side navigation. */
		id: string;
		title: string;
		/** Component name shown as code next to the title, for example `Button`. */
		name?: string;
		/** When to use it. Text between backticks shows as code, as in catalogo.md. */
		description?: string;
		/** Second line, quieter: when not to use it. Backticks work the same. */
		note?: string;
		/** The specimens, laid on one stage with no extra boxes around them. */
		children: Snippet;
	};

	let { id, title, name, description, note, children }: Props = $props();

	// odd parts sit between backticks
	const parts = (text: string) => text.split('`');
</script>

{#snippet rich(text: string)}
	{#each parts(text) as part, index (index)}
		{#if index % 2}<code>{part}</code>{:else}{part}{/if}
	{/each}
{/snippet}

<section class="showcase" {id} aria-labelledby="{id}-title">
	<header class="header">
		<div class="heading">
			<h3 class="title" id="{id}-title">{title}</h3>
			{#if name && name !== title}<code class="name">{name}</code>{/if}
		</div>
		{#if description}<p class="description">{@render rich(description)}</p>{/if}
		{#if note}<p class="note">{@render rich(note)}</p>{/if}
	</header>
	<div class="stage">{@render children()}</div>
</section>

<style>
	.showcase {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		min-width: 0;
		/* clears the top edge of the scrolling panel when reached by anchor */
		scroll-margin-block-start: var(--space-8);
	}
	.header {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-inline-size: var(--width-text);
	}
	.heading {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	.title {
		font-size: var(--text-title1-size);
		line-height: var(--text-title1-leading);
		letter-spacing: var(--text-title1-tracking);
		font-weight: var(--weight-semibold);
	}
	.name {
		font-family: var(--font-mono);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		color: var(--color-text-secondary);
	}
	.description {
		font-size: var(--text-body-size);
		line-height: var(--text-body-leading);
		letter-spacing: var(--text-body-tracking);
		color: var(--color-text-secondary);
	}
	.note {
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		color: var(--color-text-tertiary);
	}
	.description code,
	.note code {
		font-family: var(--font-mono);
		font-size: var(--text-footnote-size);
		padding-inline: var(--space-1);
		border-radius: var(--radius-xs);
		background: var(--color-fill-subtle);
		color: var(--color-text);
	}

	/*
	 * The stage is a grouped background, one step below the panel (Apple's grouped lists):
	 * raised surfaces stand out on it in both themes. A faint dot grid hints at a canvas.
	 */
	.stage {
		position: relative;
		min-width: 0;
		padding: var(--space-8);
		border-radius: var(--radius-xl);
		background:
			radial-gradient(circle, var(--color-fill) var(--border-width), transparent 0) 0 0 /
				var(--space-4) var(--space-4),
			var(--color-bg-app);
		box-shadow:
			inset 0 0 0 var(--border-width) var(--color-hairline),
			inset 0 1px 2px var(--color-hairline);
	}

	@media (max-width: 40rem) {
		.stage {
			padding: var(--space-4);
			border-radius: var(--radius-lg);
		}
		.title {
			font-size: var(--text-title2-size);
			line-height: var(--text-title2-leading);
			letter-spacing: var(--text-title2-tracking);
		}
	}
</style>
