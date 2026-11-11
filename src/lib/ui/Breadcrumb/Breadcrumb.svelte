<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Props = {
		label: string;
		/** The last item is the current page: it has no link. */
		items: { label: string; href?: string }[];
	};

	let { label, items }: Props = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- href comes from the caller, already resolved -->
<nav aria-label={label}>
	<ol class="list">
		<!-- keyed by position: two items may share a label, as a product named "Produtos" -->
		{#each items as item, index (index)}
			<li class="item">
				{#if index < items.length - 1 && item.href}
					<a class="link" href={item.href}>{item.label}</a>
					<Icon name="chevron-right" size="sm" />
				{:else}
					<span class="current" aria-current="page">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
	.list {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		letter-spacing: var(--text-footnote-tracking);
	}
	.item {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-text-tertiary);
	}
	.link {
		color: var(--color-text-secondary);
		text-decoration: none;
		border-radius: var(--radius-xs);
		transition: color var(--duration-fast) var(--ease-standard);
	}
	.link:hover {
		color: var(--color-text);
	}
	.current {
		color: var(--color-text);
		font-weight: var(--weight-medium);
	}
</style>
