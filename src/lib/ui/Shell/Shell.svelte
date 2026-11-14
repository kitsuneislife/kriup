<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** Navigation column: workspace switcher, NavItems, account. */
		sidebar: Snippet;
		children: Snippet;
	};

	let { sidebar, children }: Props = $props();
</script>

<div class="shell">
	<aside class="sidebar">{@render sidebar()}</aside>
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
		gap: var(--space-2);
		padding: var(--space-3);
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--color-fill-strong) transparent;
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

	/* narrow screens: the sidebar becomes a block above the content */
	@media (max-width: 40rem) {
		.shell {
			display: block;
			block-size: auto;
			overflow: visible;
		}
		.main {
			padding: 0 var(--space-2) var(--space-2);
		}
		.panel {
			block-size: auto;
		}
	}
</style>
