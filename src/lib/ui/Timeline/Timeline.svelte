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
	/* vertical rail between dots */
	.item:not(:last-child)::before {
		content: '';
		position: absolute;
		inset-block: calc(var(--space-3) + var(--space-2)) 0;
		inset-inline-start: calc(var(--space-3) / 2 - 1px);
		inline-size: 2px;
		background: var(--color-fill-strong);
		border-radius: var(--radius-pill);
	}
	.dot {
		flex: none;
		inline-size: var(--space-3);
		block-size: var(--space-3);
		margin-block-start: var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--_c);
		border: var(--border-width) solid var(--_c);
	}
	[data-state='upcoming'] .dot {
		background: var(--color-bg-raised);
		border-color: var(--color-border-strong);
	}
	[data-state='current'] .dot {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--_c) 22%, transparent);
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
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		font-variant-numeric: tabular-nums;
	}
	.description {
		margin: 0;
		color: var(--color-text-secondary);
	}
</style>
