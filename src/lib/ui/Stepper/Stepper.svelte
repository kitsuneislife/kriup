<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Props = {
		label: string;
		steps: string[];
		/** Index of the current step, starting at 0. */
		current: number;
	};

	let { label, steps, current }: Props = $props();
</script>

<ol class="stepper" aria-label={label}>
	{#each steps as step, index (step)}
		{@const state = index < current ? 'done' : index === current ? 'current' : 'todo'}
		<li class="step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
			<span class="dot">
				{#if state === 'done'}<Icon name="check" size="sm" />{:else}{index + 1}{/if}
			</span>
			<span class="name">{step}</span>
		</li>
	{/each}
</ol>

<style>
	.stepper {
		display: flex;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.step {
		position: relative;
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--space-2);
		min-inline-size: 0;
	}
	/* the connector fills from the dot to the next one */
	.step::before {
		content: '';
		position: absolute;
		inset-block-start: calc(var(--control-sm) / 2 - 1px);
		inset-inline: calc(var(--control-sm) + var(--space-2)) calc(var(--space-2) * -1);
		block-size: 2px;
		border-radius: var(--radius-pill);
		background: var(--color-fill-strong);
	}
	.step:last-child::before {
		display: none;
	}
	.step[data-state='done']::before {
		background: var(--color-accent);
	}
	.dot {
		display: grid;
		place-items: center;
		inline-size: var(--control-sm);
		block-size: var(--control-sm);
		border-radius: var(--radius-pill);
		background: var(--color-fill);
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		font-variant-numeric: tabular-nums;
		font-weight: var(--weight-semibold);
		transition:
			background-color var(--duration-base) var(--ease-standard),
			color var(--duration-base) var(--ease-standard);
	}
	[data-state='done'] .dot {
		background: var(--color-accent);
		color: var(--color-text-on-accent);
	}
	/* current: accent border and halo */
	[data-state='current'] .dot {
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
		border: var(--border-width) solid var(--color-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent);
		color: var(--color-text);
	}
	.name {
		overflow: hidden;
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		letter-spacing: var(--text-footnote-tracking);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	[data-state='current'] .name {
		color: var(--color-text);
		font-weight: var(--weight-medium);
	}
	/* on a phone only the current label stays visible */
	@media (max-width: 40rem) {
		.step:not([data-state='current']) .name {
			display: none;
		}
	}
</style>
