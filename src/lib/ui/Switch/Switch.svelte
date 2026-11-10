<script lang="ts">
	type Props = {
		label: string;
		checked?: boolean;
		hint?: string;
		name?: string;
		disabled?: boolean;
	};

	let { label, checked = $bindable(false), hint, name, disabled = false }: Props = $props();
</script>

<label class="switch" data-disabled={disabled}>
	<span class="text">
		<span class="label">{label}</span>
		{#if hint}<span class="hint">{hint}</span>{/if}
	</span>
	<input type="checkbox" role="switch" {name} {disabled} bind:checked />
	<span class="track"><span class="thumb"></span></span>
</label>

<style>
	.switch {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
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
	.track {
		position: relative;
		flex: none;
		inline-size: var(--switch-width);
		block-size: var(--switch-height);
		border-radius: var(--radius-pill);
		background: var(--color-fill-strong);
		box-shadow: inset 0 0 0 var(--border-width) var(--color-hairline);
		transition: background-color var(--duration-base) var(--ease-standard);
	}
	.thumb {
		position: absolute;
		inset-block: 0.125rem;
		inset-inline-start: 0.125rem;
		inline-size: calc(var(--switch-height) - 0.25rem);
		border-radius: var(--radius-pill);
		background: var(--white);
		box-shadow:
			0 1px 3px var(--shadow-color),
			0 0 0 var(--border-width) var(--color-hairline);
		transition: transform var(--duration-base) var(--ease-spring);
	}
	.switch:active .thumb {
		transform: scaleX(1.12);
	}
	input:checked ~ .track {
		background: var(--color-success);
	}
	input:checked ~ .track .thumb {
		transform: translateX(calc(var(--switch-width) - var(--switch-height)));
	}
	.switch:active input:checked ~ .track .thumb {
		transform: translateX(calc(var(--switch-width) - var(--switch-height) - 0.125rem)) scaleX(1.12);
	}
	input:focus-visible ~ .track {
		outline: var(--focus-width) solid var(--focus-color);
		outline-offset: var(--focus-offset);
	}
	[data-disabled='true'] {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
