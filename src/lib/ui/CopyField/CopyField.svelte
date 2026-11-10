<script lang="ts">
	import Button from '../Button/Button.svelte';
	import Field from '../Field/Field.svelte';

	type Props = {
		label: string;
		/** Text to copy, for example the Pix copy-and-paste code. */
		value: string;
		copyLabel: string;
		/** Shown on the button for two seconds after copying. */
		copiedLabel: string;
		hint?: string;
	};

	let { label, value, copyLabel, copiedLabel, hint }: Props = $props();

	const id = $props.id();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(value);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<Field {id} {label} {hint}>
	<input
		{id}
		class="text"
		type="text"
		readonly
		{value}
		onfocus={(event) => event.currentTarget.select()}
	/>
	{#snippet trailing()}
		<Button size="sm" icon={copied ? 'check' : 'copy'} onclick={copy}>
			{copied ? copiedLabel : copyLabel}
		</Button>
	{/snippet}
</Field>

<span class="sr-only" role="status">{copied ? copiedLabel : ''}</span>

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
		font-size: var(--text-footnote-size);
		text-overflow: ellipsis;
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
