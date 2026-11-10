<script lang="ts" module>
	import type { IconName } from '../Icon/icons';

	export type MenuItem = {
		label: string;
		icon?: IconName;
		onselect?: () => void;
		href?: string;
		danger?: boolean;
		disabled?: boolean;
		/** Draws a divider above this item, to group actions. */
		separator?: boolean;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import Popover from '../Popover/Popover.svelte';

	type Props = {
		label: string;
		items: MenuItem[];
		align?: 'start' | 'end';
		trigger: Snippet<[props: { onclick: () => void; expanded: boolean; controls: string }]>;
	};

	let { label, items, align = 'start', trigger }: Props = $props();

	let open = $state(false);
	let list: HTMLElement | undefined = $state();

	const enabled = () => [
		...(list?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])
	];

	// focus the first item when the menu opens
	$effect(() => {
		if (open) enabled()[0]?.focus();
	});

	function onkeydown(event: KeyboardEvent) {
		const nodes = enabled();
		const index = nodes.indexOf(document.activeElement as HTMLElement);
		const target: Record<string, HTMLElement | undefined> = {
			ArrowDown: nodes[(index + 1) % nodes.length],
			ArrowUp: nodes[(index - 1 + nodes.length) % nodes.length],
			Home: nodes[0],
			End: nodes.at(-1)
		};
		if (event.key in target) {
			event.preventDefault();
			target[event.key]?.focus();
		}
		if (event.key === 'Tab') open = false;
	}

	function select(item: MenuItem) {
		if (item.disabled) return;
		open = false;
		item.onselect?.();
	}
</script>

<Popover bind:open {label} {align} {trigger}>
	<!-- eslint-disable svelte/no-navigation-without-resolve -- href comes from the caller, already resolved -->
	<div class="menu" role="menu" aria-label={label} tabindex="-1" bind:this={list} {onkeydown}>
		{#each items as item (item.label)}
			{#if item.separator}<hr class="separator" />{/if}
			{#if item.href && !item.disabled}
				<a
					class="item"
					role="menuitem"
					tabindex="-1"
					href={item.href}
					data-danger={item.danger}
					onclick={() => select(item)}
				>
					{#if item.icon}<Icon name={item.icon} size="sm" />{/if}
					{item.label}
				</a>
			{:else}
				<button
					class="item"
					role="menuitem"
					tabindex="-1"
					type="button"
					aria-disabled={item.disabled}
					data-danger={item.danger}
					onclick={() => select(item)}
				>
					{#if item.icon}<Icon name={item.icon} size="sm" />{/if}
					{item.label}
				</button>
			{/if}
		{/each}
	</div>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</Popover>

<style>
	/* the Popover surface already pads; the menu sits flush so items reach the edge */
	.menu {
		display: flex;
		flex-direction: column;
		margin: calc(var(--space-2) * -1);
		min-inline-size: 11rem;
	}
	.item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-block-size: var(--control-sm);
		padding: 0 var(--space-3);
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-text);
		font: inherit;
		text-align: start;
		text-decoration: none;
		cursor: pointer;
		transition: background-color var(--duration-fast) var(--ease-standard);
	}
	.item:hover,
	.item:focus-visible {
		background: var(--color-fill);
	}
	.item:focus-visible {
		outline-offset: calc(var(--focus-offset) * -1);
	}
	[data-danger='true'] {
		color: var(--color-danger);
	}
	[aria-disabled='true'] {
		opacity: 0.4;
		cursor: not-allowed;
	}
	[aria-disabled='true']:hover {
		background: none;
	}
	.separator {
		margin: var(--space-1) var(--space-2);
		border: 0;
		border-block-start: var(--border-width) solid var(--color-hairline);
	}
</style>
