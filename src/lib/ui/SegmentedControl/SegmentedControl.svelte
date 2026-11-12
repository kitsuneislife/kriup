<script lang="ts">
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';

	type Option = { value: string; label: string; icon?: IconName };

	type Props = {
		/** Accessible name of the group. */
		label: string;
		options: Option[];
		value?: string;
		size?: 'sm' | 'md';
		/** Shows only the icons; the labels stay as accessible names. */
		iconOnly?: boolean;
		/** Sends the chosen value with a form under this name. */
		name?: string;
	};

	const id = $props.id();
	let {
		label,
		options,
		value = $bindable(),
		size = 'md',
		iconOnly = false,
		name = id
	}: Props = $props();
	const index = $derived(
		Math.max(
			0,
			options.findIndex((option) => option.value === value)
		)
	);
</script>

<div
	class="segmented"
	role="radiogroup"
	aria-label={label}
	data-size={size}
	style:--count={options.length}
	style:--index={index}
>
	<span class="thumb"></span>
	{#each options as option (option.value)}
		<label class="option" title={iconOnly ? option.label : undefined}>
			<input type="radio" {name} value={option.value} bind:group={value} />
			{#if option.icon}<Icon name={option.icon} size="sm" />{/if}
			<span class="text" data-hidden={iconOnly && option.icon !== undefined}>{option.label}</span>
		</label>
	{/each}
</div>

<style>
	.segmented {
		position: relative;
		display: inline-grid;
		grid-template-columns: repeat(var(--count), 1fr);
		padding: var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--color-fill);
		box-shadow: inset 0 1px 1px var(--color-hairline);
	}
	[data-size='sm'] {
		--_h: calc(var(--control-sm) - var(--space-2));
	}
	[data-size='md'] {
		--_h: calc(var(--control-md) - var(--space-2));
	}

	/* the thumb slides with transform; its width is one column */
	.thumb {
		position: absolute;
		inset-block: var(--space-1);
		inset-inline-start: var(--space-1);
		inline-size: calc((100% - var(--space-2)) / var(--count));
		border-radius: var(--radius-pill);
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			var(--shadow-1);
		transform: translateX(calc(var(--index) * 100%));
		transition: transform var(--duration-base) var(--ease-spring);
	}

	.option {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		block-size: var(--_h);
		padding-inline: var(--space-4);
		border-radius: var(--radius-pill);
		font-size: var(--text-footnote-size);
		line-height: 1;
		font-weight: var(--weight-medium);
		color: var(--color-text-secondary);
		cursor: pointer;
		white-space: nowrap;
		transition: color var(--duration-base) var(--ease-standard);
	}
	.option:hover {
		color: var(--color-text);
	}
	.option:has(input:checked) {
		color: var(--color-text);
	}
	input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.option:has(input:focus-visible) {
		outline: var(--focus-width) solid var(--focus-color);
		outline-offset: calc(var(--space-1) * -1 + var(--border-width));
	}
	[data-hidden='true'] {
		position: absolute;
		inline-size: var(--border-width);
		block-size: var(--border-width);
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
