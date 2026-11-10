<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';
	import Spinner from '../Spinner/Spinner.svelte';
	import type { Size } from '../types';

	type Props = {
		variant?: 'primary' | 'neutral' | 'ghost' | 'danger';
		size?: Size;
		icon?: IconName;
		iconEnd?: IconName;
		/** Accessible name. Required when the button has an icon and no text. */
		label?: string;
		/** Name read while loading, for example "Saving". Keeps the width of the button. */
		loading?: string;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		fullWidth?: boolean;
		/** For buttons that open a Menu or Popover: sets aria-expanded, aria-haspopup, aria-controls. */
		expanded?: boolean;
		haspopup?: 'menu' | 'dialog';
		controls?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
	};

	let {
		variant = 'neutral',
		size = 'md',
		icon,
		iconEnd,
		label,
		loading,
		href,
		type = 'button',
		disabled = false,
		fullWidth = false,
		expanded,
		haspopup,
		controls,
		onclick,
		children
	}: Props = $props();

	const iconSize = $derived(size === 'lg' ? 'md' : 'sm');
	const inert = $derived(disabled || loading !== undefined);
</script>

{#snippet inside()}
	<span class="content">
		{#if icon}<Icon name={icon} size={iconSize} />{/if}
		{#if children}<span>{@render children()}</span>{/if}
		{#if iconEnd}<Icon name={iconEnd} size={iconSize} />{/if}
	</span>
	{#if loading !== undefined}
		<span class="spin"><Spinner size={iconSize} label={loading} /></span>
	{/if}
{/snippet}

{#if href && !inert}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- href comes from the caller, already resolved -->
	<a
		class="button"
		data-variant={variant}
		data-size={size}
		data-icon-only={!children}
		data-full={fullWidth}
		{href}
		aria-label={label}
	>
		{@render inside()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		class="button"
		data-variant={variant}
		data-size={size}
		data-icon-only={!children}
		data-loading={loading !== undefined}
		data-full={fullWidth}
		{type}
		disabled={inert}
		aria-label={label}
		aria-busy={loading !== undefined ? true : undefined}
		aria-expanded={expanded}
		aria-haspopup={haspopup}
		aria-controls={controls}
		{onclick}
	>
		{@render inside()}
	</button>
{/if}

<style>
	.button {
		--_c: var(--color-accent);
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		block-size: var(--_h);
		padding-inline: var(--_px);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-pill);
		background: none;
		font: inherit;
		font-size: var(--_font);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		font-weight: var(--weight-medium);
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
		transition:
			transform var(--duration-fast) var(--ease-standard),
			opacity var(--duration-base) var(--ease-standard);
	}

	/* hover and pressed shade live in an overlay, so only opacity animates */
	.button::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: var(--_shade, var(--white));
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-standard);
		pointer-events: none;
	}
	.button:hover::before {
		opacity: var(--_hover, 0.12);
	}
	.button:active {
		transform: scale(var(--press-scale));
	}
	.button:active::before {
		--_shade: var(--black);
		opacity: 0.1;
	}
	.button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.button:disabled::before {
		opacity: 0;
	}
	.button:disabled:active {
		transform: none;
	}

	/* sizes */
	[data-size='sm'] {
		--_h: var(--control-sm);
		--_px: var(--space-3);
		--_font: var(--text-footnote-size);
	}
	[data-size='md'] {
		--_h: var(--control-md);
		--_px: var(--space-4);
		--_font: var(--text-subhead-size);
	}
	[data-size='lg'] {
		--_h: var(--control-lg);
		--_px: var(--space-6);
		--_font: var(--text-body-size);
	}
	[data-icon-only='true'] {
		inline-size: var(--_h);
		padding-inline: 0;
	}
	[data-full='true'] {
		display: flex;
		inline-size: 100%;
	}

	.content {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		transition: opacity var(--duration-fast) var(--ease-standard);
	}
	[data-loading='true'] .content {
		opacity: 0;
	}
	.spin {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	/*
	 * primary and danger: the tone one step deeper, so white text sits calm on it; a short
	 * gradient, a lighter rim and a soft top glint give it body without shine.
	 */
	[data-variant='primary'],
	[data-variant='danger'] {
		--_base: color-mix(in oklab, var(--_c) 84%, var(--black));
		--_hover: 0.08;
		color: var(--color-text-on-accent);
		text-shadow: 0 1px 0 rgb(0 0 0 / 0.12);
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--_base) 90%, var(--white)),
			var(--_base)
		);
		border-color: color-mix(in oklab, var(--_base) 70%, var(--white));
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.14),
			0 0 0 var(--border-width) var(--color-edge),
			0 1px 3px color-mix(in srgb, var(--_base) 35%, transparent);
	}
	[data-variant='danger'] {
		--_c: var(--color-danger);
	}

	/* neutral: paper-like gradient with a hairline ring */
	[data-variant='neutral'] {
		color: var(--color-text);
		background: linear-gradient(180deg, var(--button-neutral-top), var(--button-neutral-bottom));
		border-color: var(--button-neutral-border);
		--_shade: var(--gray);
		--_hover: 0.1;
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			0 0 0 var(--border-width) var(--button-neutral-ring),
			var(--shadow-1);
	}

	[data-variant='ghost'] {
		color: var(--color-text);
		--_shade: var(--gray);
		--_hover: 0.16;
	}
</style>
