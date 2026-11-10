<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';

	type Props = {
		title: string;
		icon?: IconName;
		open?: boolean;
		/** Short summary on the right of the closed header, for example "3 itens". */
		summary?: string;
		children: Snippet;
	};

	let { title, icon, open = $bindable(false), summary, children }: Props = $props();
</script>

<details class="disclosure" bind:open>
	<summary class="summary">
		{#if icon}<span class="lead"><Icon name={icon} /></span>{/if}
		<span class="title">{title}</span>
		{#if summary}<span class="hint">{summary}</span>{/if}
		<span class="chevron"><Icon name="chevron-down" size="sm" /></span>
	</summary>
	<div class="content">{@render children()}</div>
</details>

<style>
	.disclosure {
		border-radius: var(--radius-lg);
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			0 0 0 var(--border-width) var(--color-edge);
		/* lets the content height animate from 0 to auto */
		interpolate-size: allow-keywords;
	}
	/* the panel slides open and closed; browsers without ::details-content just snap */
	.disclosure::details-content {
		block-size: 0;
		overflow: clip;
		opacity: 0;
		transition:
			block-size var(--duration-base) var(--ease-standard),
			opacity var(--duration-base) var(--ease-standard),
			content-visibility var(--duration-base) allow-discrete;
	}
	.disclosure[open]::details-content {
		block-size: auto;
		opacity: 1;
	}
	.summary {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-block-size: var(--control-lg);
		padding: 0 var(--space-4);
		border-radius: inherit;
		list-style: none;
		cursor: pointer;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		transition: background-color var(--duration-fast) var(--ease-standard);
	}
	.summary::-webkit-details-marker {
		display: none;
	}
	.summary:hover {
		background: var(--color-fill-subtle);
	}
	.lead {
		display: inline-flex;
		color: var(--color-text-secondary);
	}
	.title {
		flex: 1;
		font-weight: var(--weight-medium);
	}
	.hint {
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
	}
	.chevron {
		display: inline-flex;
		color: var(--color-text-secondary);
		transition: transform var(--duration-base) var(--ease-spring);
	}
	[open] .summary {
		border-end-start-radius: 0;
		border-end-end-radius: 0;
	}
	[open] .chevron {
		transform: rotate(180deg);
	}
	.content {
		padding: var(--space-4);
		border-block-start: var(--border-width) solid var(--color-hairline);
	}
</style>
