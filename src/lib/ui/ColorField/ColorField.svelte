<script lang="ts">
	import Field from '../Field/Field.svelte';
	import { isHexColor, normalizeHex } from './hex';

	type Props = {
		label: string;
		/** "#rrggbb". Brand colors are data from the producer, the only hex the kit accepts. */
		value?: string;
		/** Form field name. The text input carries it, so the color is sent without JavaScript too. */
		name?: string;
		hint?: string;
		error?: string;
		/** Accessible name of the color picker. */
		pickerLabel: string;
		disabled?: boolean;
	};

	let {
		label,
		value = $bindable('#000000'),
		name,
		hint,
		error,
		pickerLabel,
		disabled = false
	}: Props = $props();

	const id = $props.id();
	// what is typed may be incomplete; `value` only changes when it is a valid color
	let draft = $derived(value);
</script>

<Field {id} {label} {hint} {error} {disabled}>
	<input
		{id}
		{name}
		class="text"
		type="text"
		{disabled}
		spellcheck="false"
		autocomplete="off"
		maxlength="7"
		aria-invalid={error ? true : undefined}
		aria-describedby={error || hint ? `${id}-message` : undefined}
		bind:value={draft}
		oninput={() => {
			const hex = normalizeHex(draft);
			if (hex) value = hex;
		}}
		onblur={() => (draft = value)}
	/>
	{#snippet trailing()}
		<input
			class="picker"
			type="color"
			{disabled}
			aria-label={pickerLabel}
			value={isHexColor(value) ? value : '#000000'}
			oninput={(event) => (value = event.currentTarget.value)}
		/>
	{/snippet}
</Field>

<style>
	.text {
		flex: 1;
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
		outline: 0;
		background: none;
		color: var(--color-text);
		font: inherit;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: var(--text-subhead-size);
		letter-spacing: 0;
		text-transform: lowercase;
	}
	/* the native picker, trimmed to a round swatch */
	.picker {
		flex: none;
		inline-size: var(--icon-lg);
		block-size: var(--icon-lg);
		padding: 0;
		border: var(--border-width) solid var(--color-border-strong);
		border-radius: var(--radius-pill);
		background: none;
		cursor: pointer;
		appearance: none;
	}
	.picker::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.picker::-webkit-color-swatch {
		border: 0;
		border-radius: var(--radius-pill);
	}
	.picker::-moz-color-swatch {
		border: 0;
		border-radius: var(--radius-pill);
	}
	.picker:disabled {
		cursor: not-allowed;
	}
</style>
