<script lang="ts">
	import type { Snippet } from 'svelte';

	type TriggerProps = {
		onclick: () => void;
		expanded: boolean;
		controls: string;
	};

	type Props = {
		open?: boolean;
		/** Which edge of the trigger the panel lines up with. */
		align?: 'start' | 'end';
		/** Accessible name of the panel. */
		label: string;
		/** Spread onto the trigger Button: `<Button {...props}>`. */
		trigger: Snippet<[props: TriggerProps]>;
		children: Snippet<[close: () => void]>;
	};

	let { open = $bindable(false), align = 'start', label, trigger, children }: Props = $props();

	const panelId = $props.id();
	let root: HTMLElement | undefined = $state();

	function close(returnFocus = true) {
		open = false;
		if (returnFocus) root?.querySelector<HTMLElement>('[aria-expanded]')?.focus();
	}

	// shortcut: the panel is absolutely positioned under the trigger, so a parent with
	// overflow hidden clips it. Move to the native popover API when anchor positioning is baseline.
	function onwindowclick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) close(false);
	}
	function onkeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.stopPropagation();
			close();
		}
	}
</script>

<svelte:window onclick={onwindowclick} />

<span class="root" bind:this={root} {onkeydown} role="presentation">
	{@render trigger({
		onclick: () => (open = !open),
		expanded: open,
		controls: panelId
	})}
	<!-- always in the DOM so the panel can animate out; display: none hides it when closed -->
	<div
		id={panelId}
		class="panel"
		data-align={align}
		data-open={open}
		role="dialog"
		aria-label={label}
	>
		{@render children(close)}
	</div>
</span>

<style>
	.root {
		position: relative;
		display: inline-flex;
	}
	/*
	 * Translucent material with a tight double border: a light rim inside, a dark edge outside.
	 * Opens with a short drop and scale from the trigger, closes with a quicker fade.
	 */
	.panel {
		position: absolute;
		inset-block-start: calc(100% + var(--space-2));
		z-index: var(--z-popover);
		display: none;
		min-inline-size: 12rem;
		padding: var(--space-3);
		border-radius: var(--radius-lg);
		background: var(--color-bg-material);
		backdrop-filter: blur(var(--blur-material)) saturate(1.8);
		border: var(--border-width) solid var(--color-border);
		box-shadow:
			0 0 0 var(--border-width) var(--color-edge),
			inset 0 1px 0 var(--color-highlight),
			var(--shadow-3);
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		opacity: 0;
		transform: translateY(calc(var(--shift) * -0.5)) scale(0.97);
		transition:
			opacity var(--duration-fast) var(--ease-exit),
			transform var(--duration-fast) var(--ease-exit),
			display var(--duration-fast) allow-discrete;
	}
	.panel[data-open='true'] {
		display: block;
		opacity: 1;
		transform: none;
		transition-timing-function: var(--ease-enter);
	}
	@starting-style {
		.panel[data-open='true'] {
			opacity: 0;
			transform: translateY(calc(var(--shift) * -0.5)) scale(0.97);
		}
	}
	[data-align='start'] {
		inset-inline-start: 0;
		transform-origin: top left;
	}
	[data-align='end'] {
		inset-inline-end: 0;
		transform-origin: top right;
	}
</style>
