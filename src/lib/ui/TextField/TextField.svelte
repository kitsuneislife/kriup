<script lang="ts">
	import Field from '../Field/Field.svelte';
	import type { IconName } from '../Icon/icons';
	import type { Size } from '../types';

	type Props = {
		label: string;
		/** Label for screen readers only, see Field. */
		labelHidden?: boolean;
		value?: string;
		name?: string;
		type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' | 'date' | 'time';
		placeholder?: string;
		hint?: string;
		error?: string;
		size?: Size;
		icon?: IconName;
		/** Number of lines. When set, the field is a multi-line text area. */
		rows?: number;
		autocomplete?: HTMLInputElement['autocomplete'];
		/** Which phone keyboard opens, for example `numeric` for a CPF. */
		inputmode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel';
		required?: boolean;
		disabled?: boolean;
	};

	let {
		label,
		labelHidden = false,
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
		inputmode,
		required = false,
		disabled = false
	}: Props = $props();

	const id = $props.id();
	const describedby = $derived(error || hint ? `${id}-message` : undefined);
</script>

<Field
	{id}
	{label}
	{labelHidden}
	{hint}
	{error}
	{size}
	{icon}
	{disabled}
	multiline={rows !== undefined}
>
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
			{inputmode}
			aria-invalid={error ? true : undefined}
			aria-describedby={describedby}
			bind:value
		/>
	{/if}
</Field>

<style>
	/* bare control styles live in Field */
	textarea {
		resize: vertical;
		field-sizing: content;
	}
</style>
