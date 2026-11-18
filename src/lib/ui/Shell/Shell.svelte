<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** Optional brand mark at the top of the sidebar. */
		brand?: Snippet;
		/** Navigation column: workspace switcher, NavItems, account. */
		sidebar: Snippet;
		children: Snippet;
	};

	let { brand, sidebar, children }: Props = $props();
</script>

<div class="shell">
	<aside class="sidebar">
		{#if brand}<div class="brand">{@render brand()}</div>{/if}
		{@render sidebar()}
	</aside>
	<main class="main">
		<!-- The panel is the scroll container: focusable so a page with no links or buttons still scrolls by keyboard (axe scrollable-region-focusable). -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="panel" tabindex="0">{@render children()}</div>
	</main>
</div>

<style>
	/* The sidebar sits on the app background; the content is a rounded panel inset from the edges. */
	.shell {
		display: grid;
		grid-template-columns: var(--width-sidebar) minmax(0, 1fr);
		/* one row capped at the viewport: without it the row grows to the content and nothing scrolls */
		grid-template-rows: minmax(0, 1fr);
		block-size: 100dvh;
		overflow: hidden;
	}
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-3);
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-fill-strong) transparent;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		color: var(--color-text);
	}
	.brand :global(svg) {
		color: var(--color-accent);
	}
	.main {
		min-width: 0;
		min-height: 0;
		padding: var(--space-2) var(--space-2) var(--space-2) 0;
	}
	.panel {
		block-size: 100%;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-fill-strong) transparent;
		border-radius: var(--radius-xl);
		background: var(--color-bg-panel);
		border: var(--border-width) solid var(--color-border);
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			var(--shadow-1);
	}

	@media (prefers-reduced-motion: no-preference) {
		.panel {
			scroll-behavior: smooth;
		}
	}

	/* narrow screens: the sidebar becomes a compact bar above the content, keeping every area link visible */
	@media (max-width: 40rem) {
		.shell {
			display: block;
			block-size: auto;
			overflow: visible;
		}
		.sidebar {
			gap: var(--space-2);
			padding: var(--space-2) var(--space-3);
		}
		.brand {
			padding: var(--space-1) var(--space-2);
		}
		.sidebar :global(nav > .stack) {
			gap: var(--space-3);
		}
		.sidebar :global(.stack:has(> a.item)) {
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--space-1);
		}
		.sidebar :global(.stack:has(> a.item) > [data-variant='caption']) {
			flex-basis: 100%;
			padding-inline: var(--space-2);
		}
		.sidebar :global(a.item) {
			block-size: var(--control-sm);
			padding-inline: var(--space-2);
			gap: var(--space-2);
			border-radius: var(--radius-sm);
			font-size: var(--text-footnote-size);
			max-inline-size: 100%;
		}
		.sidebar :global(a.item > svg) {
			inline-size: var(--icon-sm);
			block-size: var(--icon-sm);
		}
		.sidebar :global(a.item > .label) {
			flex: 0 1 auto;
		}
		.main {
			padding: 0 var(--space-2) var(--space-2);
		}
		.panel {
			block-size: auto;
		}
	}
</style>
