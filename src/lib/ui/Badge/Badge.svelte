<script lang="ts">
	import type { Snippet } from 'svelte';
	import { toneVar, type Tone } from '../types';

	type Props = {
		tone?: Tone;
		size?: 'sm' | 'md';
		/** Leading dot: use for status, so color is never the only signal next to the text. */
		dot?: boolean;
		children: Snippet;
	};

	let { tone = 'neutral', size = 'md', dot = false, children }: Props = $props();
</script>

<span class="badge" data-size={size} style:--_c={toneVar[tone]}>
	{#if dot}<span class="dot"></span>{/if}
	{@render children()}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		block-size: var(--_h);
		padding-inline: var(--space-2);
		border-radius: var(--radius-pill);
		font-size: var(--_font);
		line-height: 1;
		font-weight: var(--weight-medium);
		white-space: nowrap;
		color: light-dark(
			color-mix(in oklab, var(--black) 40%, var(--_c)),
			color-mix(in oklab, var(--white) 22%, var(--_c))
		);
		background: color-mix(in srgb, var(--_c) 15%, transparent);
		box-shadow: inset 0 0 0 var(--border-width) color-mix(in srgb, var(--_c) 22%, transparent);
	}
	[data-size='sm'] {
		--_h: 1.25rem;
		--_font: var(--text-caption-size);
	}
	[data-size='md'] {
		--_h: 1.5rem;
		--_font: var(--text-footnote-size);
	}
	.dot {
		inline-size: 0.375rem;
		block-size: 0.375rem;
		border-radius: var(--radius-pill);
		background: var(--_c);
	}
</style>
