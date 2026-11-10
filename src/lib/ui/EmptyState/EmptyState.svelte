<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';

	type Props = {
		icon?: IconName;
		title: string;
		/** One sentence on what to do next. */
		children?: Snippet;
		/** The next step as a Button. */
		action?: Snippet;
	};

	let { icon = 'folder', title, children, action }: Props = $props();
</script>

<div class="empty">
	<span class="icon"><Icon name={icon} size="lg" /></span>
	<p class="title">{title}</p>
	{#if children}<div class="message">{@render children()}</div>{/if}
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-8) var(--space-4);
		text-align: center;
	}
	.icon {
		display: grid;
		place-items: center;
		inline-size: var(--control-lg);
		block-size: var(--control-lg);
		margin-block-end: var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--color-fill-subtle);
		border: var(--border-width) solid var(--color-hairline);
		color: var(--color-text-secondary);
	}
	.title {
		font-size: var(--text-body-size);
		line-height: var(--text-body-leading);
		letter-spacing: var(--text-body-tracking);
		font-weight: var(--weight-semibold);
	}
	.message {
		max-inline-size: var(--width-column-sm);
		color: var(--color-text-secondary);
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	.action {
		margin-block-start: var(--space-3);
	}
</style>
