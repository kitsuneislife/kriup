<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';
	import type { Size } from '../types';

	type Props = {
		/** Id of the native control inside, so the label points at it. */
		id: string;
		label: string;
		/** Keeps the label for screen readers only. For search fields whose purpose the icon shows. */
		labelHidden?: boolean;
		hint?: string;
		error?: string;
		size?: Size;
		icon?: IconName;
		disabled?: boolean;
		multiline?: boolean;
		/** The native control (input, select, textarea), styled bare by its own component. */
		children: Snippet;
		trailing?: Snippet;
	};

	let {
		id,
		label,
		labelHidden = false,
		hint,
		error,
		size = 'md',
		icon,
		disabled = false,
		multiline = false,
		children,
		trailing
	}: Props = $props();
</script>

<div
	class="field"
	data-size={size}
	data-invalid={error !== undefined}
	data-disabled={disabled}
	data-multiline={multiline}
>
	<label class="label" for={id} data-hidden={labelHidden}>{label}</label>
	<div class="shell">
		{#if icon}<span class="icon"><Icon name={icon} size="sm" /></span>{/if}
		{@render children()}
		{#if trailing}{@render trailing()}{/if}
	</div>
	{#if error || hint}
		<p class="message" id="{id}-message" role={error ? 'alert' : undefined}>{error ?? hint}</p>
	{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		min-width: 0;
	}
	.label {
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		letter-spacing: var(--text-footnote-tracking);
		font-weight: var(--weight-medium);
		color: var(--color-text);
	}
	.label[data-hidden='true'] {
		position: absolute;
		inline-size: var(--border-width);
		block-size: var(--border-width);
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.shell {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-block-size: var(--_h);
		padding-inline: var(--space-4);
		background: var(--color-bg-field);
		border: var(--border-width) solid var(--color-border-strong);
		border-radius: var(--radius-pill);
		box-shadow: inset 0 1px 1px var(--color-hairline);
		transition:
			border-color var(--duration-base) var(--ease-standard),
			box-shadow var(--duration-base) var(--ease-standard);
	}
	.shell:hover {
		border-color: var(--gray-2);
	}
	.shell:focus-within {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 var(--focus-width) var(--color-accent-tint);
	}
	.icon {
		display: inline-flex;
		color: var(--color-text-secondary);
	}

	[data-size='sm'] {
		--_h: var(--control-sm);
	}
	[data-size='md'] {
		--_h: var(--control-md);
	}
	[data-size='lg'] {
		--_h: var(--control-lg);
	}
	[data-multiline='true'] .shell {
		align-items: flex-start;
		padding-block: var(--space-3);
		border-radius: var(--radius-lg);
	}

	.message {
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		color: var(--color-text-secondary);
	}

	[data-invalid='true'] .shell,
	[data-invalid='true'] .shell:hover {
		border-color: var(--color-danger);
	}
	[data-invalid='true'] .shell:focus-within {
		box-shadow: 0 0 0 var(--focus-width) color-mix(in srgb, var(--color-danger) 18%, transparent);
	}
	[data-invalid='true'] .message {
		color: light-dark(color-mix(in oklab, var(--black) 18%, var(--red)), var(--red));
	}

	[data-disabled='true'] {
		opacity: 0.5;
	}
	[data-disabled='true'] .shell {
		background: var(--color-fill-subtle);
		cursor: not-allowed;
	}
</style>
