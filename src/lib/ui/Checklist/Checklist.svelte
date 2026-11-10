<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Item = {
		label: string;
		done: boolean;
		/** Where to fix a pending item. Done items need none. */
		href?: string;
		/** Why it is pending, for example "Falta o CPF". */
		reason?: string;
	};

	type Props = {
		label: string;
		items: Item[];
	};

	let { label, items }: Props = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- href comes from the caller, already resolved -->
<ul class="checklist" aria-label={label}>
	{#each items as item (item.label)}
		<li class="item" data-done={item.done}>
			<span class="mark">
				{#if item.done}<Icon name="check" size="sm" />{/if}
			</span>
			<span class="text">
				{#if item.href && !item.done}
					<a class="link" href={item.href}>{item.label}</a>
				{:else}
					<span class="label">{item.label}</span>
				{/if}
				{#if item.reason && !item.done}<span class="reason">{item.reason}</span>{/if}
			</span>
			{#if item.href && !item.done}<Icon name="chevron-right" size="sm" />{/if}
		</li>
	{/each}
</ul>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
	.checklist {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-block: var(--space-3);
		color: var(--color-text-tertiary);
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	.item + .item {
		border-block-start: var(--border-width) solid var(--color-hairline);
	}
	.mark {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: var(--icon-md);
		block-size: var(--icon-md);
		border-radius: var(--radius-pill);
		border: var(--border-width) solid var(--color-border-strong);
		color: var(--color-text-on-accent);
	}
	[data-done='true'] .mark {
		border-color: var(--color-success);
		background: var(--color-success);
	}
	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-inline-size: 0;
	}
	[data-done='true'] .label {
		text-decoration: line-through;
	}
	[data-done='false'] {
		color: var(--color-text);
	}
	.link {
		color: inherit;
		font-weight: var(--weight-medium);
		text-decoration: none;
	}
	.link:hover {
		color: var(--color-accent);
	}
	.reason {
		color: var(--color-warning);
		font-size: var(--text-footnote-size);
	}
</style>
