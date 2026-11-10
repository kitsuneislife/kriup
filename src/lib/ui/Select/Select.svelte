<script lang="ts">
	import Field from '../Field/Field.svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';
	import type { Size } from '../types';

	type Props = {
		label: string;
		options: { value: string; label: string }[];
		value?: string;
		name?: string;
		hint?: string;
		error?: string;
		size?: Size;
		icon?: IconName;
		required?: boolean;
		disabled?: boolean;
	};

	let {
		label,
		options,
		value = $bindable(''),
		name,
		hint,
		error,
		size = 'md',
		icon,
		required = false,
		disabled = false
	}: Props = $props();

	const id = $props.id();
</script>

<Field {id} {label} {hint} {error} {size} {icon} {disabled}>
	<select
		{id}
		{name}
		{required}
		{disabled}
		aria-invalid={error ? true : undefined}
		aria-describedby={error || hint ? `${id}-message` : undefined}
		bind:value
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#snippet trailing()}
		<span class="chevron"><Icon name="chevrons-up-down" size="sm" /></span>
	{/snippet}
</Field>

<style>
	/* bare control styles live in Field; here only what is particular to a select */
	select {
		appearance: none;
		cursor: pointer;
	}
	.chevron {
		display: inline-flex;
		color: var(--color-text-secondary);
		pointer-events: none;
	}

	/*
	 * Customizable select: the list is drawn by the kit (material surface, double border, rounded
	 * rows, accent check) and opens with a short fade and drop. Browsers without it keep the
	 * system list, which is still correct.
	 */
	@supports (appearance: base-select) {
		select,
		select::picker(select) {
			appearance: base-select;
		}
		select::picker-icon {
			display: none;
		}
		select::picker(select) {
			margin-block: var(--space-2);
			padding: var(--space-1);
			min-inline-size: 12rem;
			border: var(--border-width) solid var(--color-border);
			border-radius: var(--radius-lg);
			background: var(--color-bg-material);
			backdrop-filter: blur(var(--blur-material)) saturate(1.8);
			box-shadow:
				0 0 0 var(--border-width) var(--color-edge),
				inset 0 1px 0 var(--color-highlight),
				var(--shadow-3);
			opacity: 0;
			transform: translateY(calc(var(--shift) * -0.5)) scale(0.98);
			transform-origin: top;
			transition:
				opacity var(--duration-fast) var(--ease-exit),
				transform var(--duration-fast) var(--ease-exit),
				overlay var(--duration-fast) allow-discrete,
				display var(--duration-fast) allow-discrete;
		}
		select:open::picker(select) {
			opacity: 1;
			transform: none;
			transition-timing-function: var(--ease-enter);
		}
		@starting-style {
			select:open::picker(select) {
				opacity: 0;
				transform: translateY(calc(var(--shift) * -0.5)) scale(0.98);
			}
		}
		option {
			display: flex;
			align-items: center;
			gap: var(--space-2);
			min-block-size: var(--control-sm);
			padding: 0 var(--space-3);
			border-radius: calc(var(--radius-lg) - var(--space-1));
			background: none;
			color: var(--color-text);
			font-size: var(--text-subhead-size);
			letter-spacing: var(--text-subhead-tracking);
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--ease-standard);
		}
		option:hover,
		option:focus-visible {
			background: var(--color-fill);
			outline: 0;
		}
		option:checked {
			font-weight: var(--weight-medium);
		}
		option::checkmark {
			order: 1;
			margin-inline-start: auto;
			color: var(--color-accent);
		}
	}
</style>
