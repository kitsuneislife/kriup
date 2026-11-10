<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** `frame` is the double border: an outer shell holding an inner surface, with concentric corners. */
		variant?: 'plain' | 'frame';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		selected?: boolean;
		/** Makes the whole card a link, with hover and pressed feedback. */
		href?: string;
		as?: 'div' | 'section' | 'article' | 'li';
		/** Only in `frame`: the header sits in the outer shell, above the inner surface. */
		header?: Snippet;
		children: Snippet;
	};

	let {
		variant = 'plain',
		padding = 'md',
		selected = false,
		href,
		as = 'div',
		header,
		children
	}: Props = $props();
</script>

<svelte:element
	this={href ? 'a' : as}
	class="card"
	data-variant={variant}
	data-padding={padding}
	data-selected={selected}
	data-interactive={href !== undefined}
	{href}
	aria-current={selected ? 'true' : undefined}
>
	{#if variant === 'frame'}
		{#if header}<div class="header">{@render header()}</div>{/if}
		<div class="inner">{@render children()}</div>
	{:else}
		<div class="inner">{@render children()}</div>
	{/if}
</svelte:element>

<style>
	.card {
		display: block;
		color: inherit;
		text-decoration: none;
		min-width: 0;
		transition:
			transform var(--duration-base) var(--ease-standard),
			box-shadow var(--duration-base) var(--ease-standard),
			border-color var(--duration-base) var(--ease-standard);
	}
	.card:hover {
		text-decoration: none;
	}

	/* plain: one surface, hairline + border */
	[data-variant='plain'] {
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			var(--shadow-1);
	}

	/* frame: shell (fill + border) around an inner surface (border + highlight) */
	[data-variant='frame'] {
		padding: var(--space-1);
		background: var(--color-fill-subtle);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	[data-variant='frame'] .inner {
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		border-radius: calc(var(--radius-lg) - var(--space-1));
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			var(--shadow-1);
	}
	.header {
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		font-weight: var(--weight-medium);
		color: var(--color-text-secondary);
	}

	[data-padding='none'] .inner {
		padding: 0;
	}
	[data-padding='sm'] .inner {
		padding: var(--space-3);
	}
	[data-padding='md'] .inner {
		padding: var(--space-4);
	}
	[data-padding='lg'] .inner {
		padding: var(--space-6);
	}

	[data-interactive='true'] {
		cursor: pointer;
	}
	[data-interactive='true']:hover {
		box-shadow: var(--shadow-2);
		transform: translateY(calc(var(--shift) / -4));
	}
	[data-interactive='true']:active {
		transform: scale(var(--press-scale));
	}

	/* selected: accent border plus a soft halo */
	[data-selected='true'] {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 var(--focus-width) var(--color-accent-tint);
	}
	[data-selected='true'][data-variant='frame'] .inner {
		border-color: var(--color-accent-tint);
	}
</style>
