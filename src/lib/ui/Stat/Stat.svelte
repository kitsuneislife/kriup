<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';
	import type { Tone } from '../types';
	import { toneVar } from '../types';

	type Props = {
		label: string;
		icon?: IconName;
		/** Gives the icon its meaning: success for released, warning for retained. */
		tone?: Tone;
		/** One line under the value, for example "Libera em 3 dias". */
		hint?: string;
		/** The value, usually a Money. */
		children: Snippet;
	};

	let { label, icon, tone = 'neutral', hint, children }: Props = $props();
</script>

<div class="stat" style:--_c={tone === 'neutral' ? 'var(--color-text-secondary)' : toneVar[tone]}>
	<div class="head">
		{#if icon}<span class="icon"><Icon name={icon} size="sm" /></span>{/if}
		<span class="label">{label}</span>
	</div>
	<div class="value">{@render children()}</div>
	{#if hint}<span class="hint">{hint}</span>{/if}
</div>

<style>
	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		letter-spacing: var(--text-footnote-tracking);
	}
	.icon {
		display: grid;
		place-items: center;
		inline-size: var(--control-sm);
		block-size: var(--control-sm);
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--_c) 14%, transparent);
		color: var(--_c);
	}
	.hint {
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
	}
</style>
