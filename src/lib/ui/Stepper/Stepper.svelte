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
		/* same gap on both ends of every connector */
		--_gap: var(--space-3);
		display: flex;
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
	/* the connector: a gray track (::before) and an accent fill (::after) that slides along it */
	.step::before,
	.step::after {
		content: '';
		position: absolute;
		inset-block-start: calc(var(--control-sm) / 2 - 1px);
		inset-inline: calc(var(--control-sm) + var(--_gap)) var(--_gap);
		block-size: 2px;
		border-radius: var(--radius-pill);
	}
	.step::before {
		background: var(--color-fill-strong);
	}
	.step::after {
		background: var(--color-accent);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform var(--duration-slow) var(--ease-standard);
	}
	.step[data-state='done']::after {
		transform: scaleX(1);
	}
	.step:last-child::before,
	.step:last-child::after {
		display: none;
	}
	.dot {
		display: grid;
		place-items: center;
		inline-size: var(--control-sm);
		block-size: var(--control-sm);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-pill);
		background: var(--color-fill);
		box-shadow: inset 0 1px 0 var(--color-highlight);
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		font-variant-numeric: tabular-nums;
		font-weight: var(--weight-semibold);
		transition:
			background-color var(--duration-base) var(--ease-standard),
			border-color var(--duration-base) var(--ease-standard),
			box-shadow var(--duration-base) var(--ease-standard),
			color var(--duration-base) var(--ease-standard);
	}
	/* done: filled like the primary button, the check pops in */
	[data-state='done'] .dot {
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--color-accent) 92%, var(--white)),
			color-mix(in oklab, var(--color-accent) 86%, var(--black))
		);
		border-color: color-mix(in oklab, var(--color-accent) 70%, var(--white));
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2);
		color: var(--color-text-on-accent);
	}
	[data-state='done'] .dot :global(svg) {
		animation: pop var(--duration-base) var(--ease-spring) both;
	}
	/* current: accent border and halo, the shared selected look */
	[data-state='current'] .dot {
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg-raised));
		border-color: var(--color-accent);
		box-shadow:
			0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent),
			inset 0 1px 0 var(--color-highlight);
		color: var(--color-text);
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.4);
		}
	}
	.name {
		padding-inline-end: var(--_gap);
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
