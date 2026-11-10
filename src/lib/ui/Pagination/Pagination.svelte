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
	.pagination {
		display: flex;
		align-items: center;
		gap: var(--space-1);
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
			color var(--duration-fast) var(--ease-standard);
	}
	.page:hover:not(:disabled) {
		background: var(--color-fill);
		color: var(--color-text);
	}
	/* selected: accent border and a soft halo, like every selected control */
	.page[aria-current='page'] {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent);
		color: var(--color-text);
		font-weight: var(--weight-semibold);
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
