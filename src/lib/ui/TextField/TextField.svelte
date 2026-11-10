<script lang="ts">
	import Field from '../Field/Field.svelte';
	import type { IconName } from '../Icon/icons';
	import type { Size } from '../types';

	type Props = {
		label: string;
		value?: string;
		name?: string;
		type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
		placeholder?: string;
		hint?: string;
		error?: string;
		size?: Size;
		icon?: IconName;
		/** Number of lines. When set, the field is a multi-line text area. */
		rows?: number;
		autocomplete?: HTMLInputElement['autocomplete'];
		required?: boolean;
		disabled?: boolean;
	};

	let {
		label,
		value = $bindable(''),
		name,
		type = 'text',
		placeholder,
		hint,
		error,
		size = 'md',
		icon,
		rows,
		autocomplete,
		required = false,
		disabled = false
	}: Props = $props();

	const id = $props.id();
	const describedby = $derived(error || hint ? `${id}-message` : undefined);
</script>

<Field {id} {label} {hint} {error} {size} {icon} {disabled} multiline={rows !== undefined}>
	{#if rows !== undefined}
		<textarea
			{id}
			{name}
			{rows}
			{placeholder}
			{required}
			{disabled}
			{autocomplete}
			aria-invalid={error ? true : undefined}
			aria-describedby={describedby}
			bind:value></textarea>
	{:else}
		<input
			{id}
			{name}
			{type}
			{placeholder}
			{required}
			{disabled}
			{autocomplete}
			aria-invalid={error ? true : undefined}
			aria-describedby={describedby}
			bind:value
		/>
	{/if}
</Field>

<style>
	input,
	textarea {
		flex: 1;
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
		outline: 0;
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	textarea {
		resize: vertical;
		field-sizing: content;
	}
	::placeholder {
		color: var(--color-text-tertiary);
	}
	input:disabled,
	textarea:disabled {
		cursor: not-allowed;
	}
</style>
