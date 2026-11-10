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
	select {
		flex: 1;
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
		outline: 0;
		appearance: none;
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		cursor: pointer;
	}
	select:disabled {
		cursor: not-allowed;
	}
	option {
		background: var(--color-bg-raised);
		color: var(--color-text);
	}
	.chevron {
		display: inline-flex;
		color: var(--color-text-secondary);
		pointer-events: none;
	}
</style>
