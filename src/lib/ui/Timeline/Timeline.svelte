<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tone } from '../types';
	import { toneVar } from '../types';

	type Item = {
		title: string;
		/** Already formatted by the caller (see DateTime). */
		time?: string;
		description?: string;
		/** done is filled, current has the halo, upcoming is hollow. */
		state?: 'done' | 'current' | 'upcoming';
		tone?: Tone;
	};

	type Props = {
		label: string;
		items: Item[];
		/** Extra content under an item, for example an action. */
		extra?: Snippet<[item: Item]>;
	};

	let { label, items, extra }: Props = $props();
</script>

<ol class="timeline" aria-label={label}>
	{#each items as item, index (index)}
		<li
			class="item"
			data-state={item.state ?? 'done'}
			style:--_c={toneVar[item.tone ?? 'accent']}
			aria-current={item.state === 'current' ? 'step' : undefined}
		>
			<span class="dot"></span>
			<div class="body">
				<div class="head">
					<span class="title">{item.title}</span>
					{#if item.time}<span class="time">{item.time}</span>{/if}
				</div>
				{#if item.description}<p class="description">{item.description}</p>{/if}
				{#if extra}{@render extra(item)}{/if}
			</div>
		</li>
	{/each}
</ol>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.item {
		position: relative;
		display: flex;
		gap: var(--space-3);
		padding-block-end: var(--space-4);
	}
	.item:last-child {
		padding-block-end: 0;
	}
	/* vertical rail between dots: tinted by the tone where the path is walked, gray ahead */
	.item:not(:last-child)::before {
		content: '';
		position: absolute;
		inset-block: calc(var(--space-1) + var(--space-3) + var(--space-1)) var(--space-1);
		inset-inline-start: calc(var(--space-3) / 2 - 1px);
		inline-size: 2px;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--_c) 55%, transparent),
			color-mix(in srgb, var(--_c) 20%, transparent)
		);
		border-radius: var(--radius-pill);
	}
	.item:is([data-state='current'], [data-state='upcoming'])::before {
		background: var(--color-fill-strong);
	}
	.item[data-state='upcoming']::before {
		background: repeating-linear-gradient(
			180deg,
			var(--color-fill-strong) 0 0.25rem,
			transparent 0.25rem 0.5rem
		);
	}
	/* dots are small gems: tone gradient with a glint */
	.dot {
		position: relative;
		flex: none;
		inline-size: var(--space-3);
		block-size: var(--space-3);
		margin-block-start: var(--space-1);
		border-radius: var(--radius-pill);
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--_c) 85%, var(--white)),
			color-mix(in oklab, var(--_c) 90%, var(--black))
		);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.3),
			0 0 0 var(--border-width) color-mix(in srgb, var(--_c) 40%, transparent);
	}
	[data-state='upcoming'] .dot {
		background: var(--color-bg-raised);
		box-shadow: inset 0 0 0 1.5px var(--color-border-strong);
	}
	/* current: a halo that breathes, so the eye finds "now" */
	[data-state='current'] .dot::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: var(--_c);
		animation: breathe 2.4s var(--ease-standard) infinite;
	}
	@keyframes breathe {
		from {
			opacity: 0.45;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(2.6);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		[data-state='current'] .dot::after {
			animation: none;
			opacity: 0.2;
			transform: scale(1.8);
		}
	}
	.body {
		flex: 1;
		min-inline-size: 0;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		column-gap: var(--space-3);
	}
	.title {
		font-weight: var(--weight-medium);
	}
	[data-state='upcoming'] .title {
		color: var(--color-text-secondary);
	}
	.time {
		color: var(--color-text-tertiary);
		font-size: var(--text-footnote-size);
		font-variant-numeric: tabular-nums;
	}
	[data-state='current'] .time {
		color: var(--_c);
		font-weight: var(--weight-medium);
	}
	.description {
		margin: 0;
		color: var(--color-text-secondary);
	}
</style>
