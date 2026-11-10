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
	{#if open}
		<div id={panelId} class="panel" data-align={align} role="dialog" aria-label={label}>
			<div class="surface">{@render children(close)}</div>
		</div>
	{/if}
</span>

<style>
	.root {
		position: relative;
		display: inline-flex;
	}
	.panel {
		position: absolute;
		inset-block-start: calc(100% + var(--space-2));
		z-index: var(--z-popover);
		min-inline-size: 12rem;
		padding: var(--space-1);
		border-radius: var(--radius-lg);
		background: var(--color-bg-app);
		border: var(--border-width) solid var(--color-border);
		box-shadow: var(--shadow-3);
		animation: enter var(--duration-fast) var(--ease-enter) both;
	}
	[data-align='start'] {
		inset-inline-start: 0;
	}
	[data-align='end'] {
		inset-inline-end: 0;
	}
	/* concentric radii: the inner surface is 4px smaller than the shell */
	.surface {
		padding: var(--space-3);
		border-radius: calc(var(--radius-lg) - var(--space-1));
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		box-shadow: inset 0 1px 0 var(--color-highlight);
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(var(--shift)) scale(0.98);
		}
	}
</style>
