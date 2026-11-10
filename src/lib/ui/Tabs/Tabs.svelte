<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';

	type Tab = { value: string; label: string; icon?: IconName; count?: number };

	type Props = {
		label: string;
		tabs: Tab[];
		value: string;
		/** Content of the selected tab. */
		children: Snippet<[value: string]>;
	};

	let { label, tabs, value = $bindable(), children }: Props = $props();

	const id = $props.id();
	let list: HTMLElement | undefined = $state();

	function onkeydown(event: KeyboardEvent) {
		const index = tabs.findIndex((tab) => tab.value === value);
		const next: Record<string, number> = {
			ArrowRight: (index + 1) % tabs.length,
			ArrowLeft: (index - 1 + tabs.length) % tabs.length,
			Home: 0,
			End: tabs.length - 1
		};
		const target = next[event.key];
		if (target === undefined) return;
		event.preventDefault();
		value = tabs[target]?.value ?? value;
		list?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
	}
</script>

<div class="tabs">
	<div class="list" role="tablist" aria-label={label} tabindex="-1" bind:this={list} {onkeydown}>
		{#each tabs as tab (tab.value)}
			<button
				class="tab"
				id="{id}-{tab.value}"
				role="tab"
				type="button"
				aria-selected={tab.value === value}
				aria-controls="{id}-panel"
				tabindex={tab.value === value ? 0 : -1}
				onclick={() => (value = tab.value)}
			>
				{#if tab.icon}<Icon name={tab.icon} size="sm" />{/if}
				{tab.label}
				{#if tab.count !== undefined}<span class="count">{tab.count}</span>{/if}
			</button>
		{/each}
	</div>
	<div class="panel" id="{id}-panel" role="tabpanel" aria-labelledby="{id}-{value}" tabindex="0">
		{@render children(value)}
	</div>
</div>

<style>
	.tabs {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.list {
		display: flex;
		gap: var(--space-1);
		overflow-x: auto;
		border-block-end: var(--border-width) solid var(--color-hairline);
		scrollbar-width: none;
	}
	.tab {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		flex: none;
		min-block-size: var(--control-md);
		padding: 0 var(--space-3);
		border: 0;
		background: none;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		font-weight: var(--weight-medium);
		cursor: pointer;
		transition: color var(--duration-fast) var(--ease-standard);
	}
	.tab:hover {
		color: var(--color-text);
	}
	.tab[aria-selected='true'] {
		color: var(--color-text);
	}
	/* indicator: scales in from the middle, so only transform animates */
	.tab::after {
		content: '';
		position: absolute;
		inset-inline: var(--space-2);
		inset-block-end: -1px;
		block-size: 2px;
		border-radius: var(--radius-pill);
		background: var(--color-accent);
		transform: scaleX(0);
		transition: transform var(--duration-base) var(--ease-spring);
	}
	.tab[aria-selected='true']::after {
		transform: scaleX(1);
	}
	.count {
		padding: 0 var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--color-fill);
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		font-variant-numeric: tabular-nums;
	}
	.panel:focus-visible {
		border-radius: var(--radius-sm);
	}
</style>
