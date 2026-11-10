<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Props = {
		label: string;
		checked?: boolean;
		/** Secondary line under the label. */
		hint?: string;
		name?: string;
		value?: string;
		disabled?: boolean;
	};

	let { label, checked = $bindable(false), hint, name, value, disabled = false }: Props = $props();
</script>

<label class="checkbox" data-disabled={disabled}>
	<input type="checkbox" {name} {value} {disabled} bind:checked />
	<span class="box"><Icon name="check" size="sm" /></span>
	<span class="text">
		<span class="label">{label}</span>
		{#if hint}<span class="hint">{hint}</span>{/if}
	</span>
</label>

<style>
	.checkbox {
		display: inline-flex;
		align-items: flex-start;
		gap: var(--space-3);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.box {
		display: grid;
		place-items: center;
		flex: none;
		inline-size: var(--icon-md);
		block-size: var(--icon-md);
		border-radius: var(--radius-xs);
		color: var(--color-text-on-accent);
		background: var(--color-bg-field);
		border: var(--border-width) solid var(--color-border-strong);
		box-shadow: inset 0 1px 1px var(--color-hairline);
		transition:
			background-color var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard),
			transform var(--duration-fast) var(--ease-standard);
	}
	.box :global(svg) {
		opacity: 0;
		transform: scale(0.6);
		transition:
			opacity var(--duration-fast) var(--ease-standard),
			transform var(--duration-base) var(--ease-spring);
	}
	.checkbox:hover .box {
		border-color: var(--gray-2);
	}
	.checkbox:active .box {
		transform: scale(var(--press-scale));
	}
	input:checked + .box {
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--white) 24%, var(--color-accent)),
			var(--color-accent)
		);
		border-color: color-mix(in oklab, var(--black) 20%, var(--color-accent));
		box-shadow: inset 0 1px 0 var(--glint);
	}
	input:checked + .box :global(svg) {
		opacity: 1;
		transform: scale(1);
	}
	input:focus-visible + .box {
		outline: var(--focus-width) solid var(--focus-color);
		outline-offset: var(--focus-offset);
	}
	.text {
		display: flex;
		flex-direction: column;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	.hint {
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		color: var(--color-text-secondary);
	}
	[data-disabled='true'] {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
