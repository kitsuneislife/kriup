<script lang="ts">
	import Icon from '../Icon/Icon.svelte';
	import { visiblePages } from './pages';

	type Props = {
		/** Current page, starting at 1. */
		page: number;
		count: number;
		label: string;
		previousLabel: string;
		nextLabel: string;
		/** Accessible name of a page button, for example `(n) => `Página ${n}``. */
		pageLabel: (page: number) => string;
	};

	let { page = $bindable(), count, label, previousLabel, nextLabel, pageLabel }: Props = $props();

	const pages = $derived(visiblePages(page, count));
</script>

<nav class="pagination" aria-label={label}>
	<button
		class="page"
		type="button"
		aria-label={previousLabel}
		disabled={page <= 1}
		onclick={() => page--}
	>
		<Icon name="chevron-left" size="sm" />
	</button>
	{#each pages as item, index (index)}
		{#if item === null}
			<span class="gap" aria-hidden="true">…</span>
		{:else}
			<button
				class="page"
				type="button"
				aria-label={pageLabel(item)}
				aria-current={item === page ? 'page' : undefined}
				onclick={() => (page = item)}
			>
				{item}
			</button>
		{/if}
	{/each}
	<button
		class="page"
		type="button"
		aria-label={nextLabel}
		disabled={page >= count}
		onclick={() => page++}
	>
		<Icon name="chevron-right" size="sm" />
	</button>
</nav>

<style>
	/* the pages sit in a fill track, like SegmentedControl; the current one is the raised thumb */
	.pagination {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--color-fill-subtle);
		box-shadow: inset 0 1px 1px var(--color-hairline);
	}
	.page {
		display: grid;
		place-items: center;
		min-inline-size: var(--control-sm);
		block-size: var(--control-sm);
		padding-inline: var(--space-2);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-pill);
		background: none;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: var(--text-footnote-size);
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition:
			background-color var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard),
			transform var(--duration-fast) var(--ease-standard);
	}
	.page:hover:not(:disabled) {
		background: var(--color-fill);
		color: var(--color-text);
	}
	/* current: the neutral button surface with depth, number in the accent */
	.page[aria-current='page'] {
		border-color: var(--button-neutral-border);
		background: linear-gradient(180deg, var(--button-neutral-top), var(--button-neutral-bottom));
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			0 0 0 var(--border-width) var(--button-neutral-ring),
			var(--shadow-1);
		color: var(--color-accent);
		font-weight: var(--weight-semibold);
		animation: settle var(--duration-base) var(--ease-spring);
	}
	.page:active:not(:disabled) {
		transform: scale(var(--press-scale));
	}
	@keyframes settle {
		from {
			transform: scale(0.85);
		}
	}
	.page:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.gap {
		min-inline-size: var(--control-sm);
		text-align: center;
		color: var(--color-text-tertiary);
	}
</style>
