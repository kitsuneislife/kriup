<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		/** Short text, one line. The wrapped control must already have its own accessible name. */
		text: string;
		placement?: 'top' | 'bottom';
		children: Snippet;
	};

	let { text, placement = 'top', children }: Props = $props();
</script>

<span class="tooltip" data-placement={placement}>
	{@render children()}
	<!-- visual only: screen readers get the name from the control itself -->
	<span class="bubble" aria-hidden="true">{text}</span>
</span>

<style>
	.tooltip {
		position: relative;
		display: inline-flex;
	}
	.bubble {
		position: absolute;
		inset-inline-start: 50%;
		z-index: var(--z-popover);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		/* same material and double border as menus, so floating things look alike */
		background: var(--color-bg-material);
		backdrop-filter: blur(var(--blur-material)) saturate(1.8);
		border: var(--border-width) solid var(--color-border);
		box-shadow:
			0 0 0 var(--border-width) var(--color-edge),
			inset 0 1px 0 var(--color-highlight),
			var(--shadow-2);
		color: var(--color-text);
		font-weight: var(--weight-medium);
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		letter-spacing: var(--text-caption-tracking);
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transform: translate(-50%, var(--_from)) scale(0.96);
		transition:
			opacity var(--duration-fast) var(--ease-exit),
			transform var(--duration-fast) var(--ease-exit);
	}
	[data-placement='top'] {
		--_from: calc(var(--shift) * -1);
	}
	[data-placement='top'] .bubble {
		inset-block-end: calc(100% + var(--space-2));
	}
	[data-placement='bottom'] {
		--_from: var(--shift);
	}
	[data-placement='bottom'] .bubble {
		inset-block-start: calc(100% + var(--space-2));
	}
	/* a short delay on hover avoids flashing while the pointer crosses the screen */
	.tooltip:hover .bubble {
		transition-delay: 400ms;
	}
	.tooltip:hover .bubble,
	.tooltip:focus-within .bubble {
		opacity: 1;
		transform: translate(-50%, 0);
		transition-timing-function: var(--ease-enter);
	}
	.tooltip:focus-within .bubble {
		transition-delay: 0s;
	}
</style>
