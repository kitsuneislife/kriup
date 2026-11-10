<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';

	type Props = {
		href: string;
		icon?: IconName;
		current?: boolean;
		/** Right side: a count, a Badge. */
		trailing?: Snippet;
		children: Snippet;
	};

	let { href, icon, current = false, trailing, children }: Props = $props();
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href comes from the caller, already resolved -->
<a class="item" {href} aria-current={current ? 'page' : undefined} data-current={current}>
	{#if icon}<Icon name={icon} />{/if}
	<span class="label">{@render children()}</span>
	{#if trailing}<span class="trailing">{@render trailing()}</span>{/if}
</a>

<style>
	.item {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		block-size: var(--control-md);
		padding-inline: var(--space-3);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		font-weight: var(--weight-medium);
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard),
			transform var(--duration-fast) var(--ease-standard);
	}
	.item:hover {
		background: var(--color-fill-subtle);
		text-decoration: none;
	}
	.item:active {
		transform: scale(var(--press-scale));
	}
	.item :global(svg) {
		color: var(--color-text-secondary);
		transition: color var(--duration-fast) var(--ease-standard);
	}
	/* selected: filled pill with a hairline, like a pressed key */
	[data-current='true'] {
		background: var(--color-fill);
		box-shadow:
			inset 0 0 0 var(--border-width) var(--color-hairline),
			inset 0 1px 0 var(--color-highlight);
	}
	[data-current='true']:hover {
		background: var(--color-fill);
	}
	[data-current='true'] :global(svg) {
		color: var(--color-text);
	}
	.label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.trailing {
		display: inline-flex;
		color: var(--color-text-secondary);
	}
</style>
