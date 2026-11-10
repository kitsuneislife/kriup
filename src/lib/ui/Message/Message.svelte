<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		author: string;
		/** Already formatted by the caller (see DateTime). */
		time?: string;
		/** Own messages sit on the right and take the accent color. */
		own?: boolean;
		children: Snippet;
	};

	let { author, time, own = false, children }: Props = $props();
</script>

<article class="message" data-own={own}>
	<header class="meta">
		<span class="author">{author}</span>
		{#if time}<span class="time">{time}</span>{/if}
	</header>
	<div class="bubble">{@render children()}</div>
</article>

<style>
	.message {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-inline-size: min(100%, var(--width-text));
		align-items: flex-start;
	}
	[data-own='true'] {
		align-self: flex-end;
		align-items: flex-end;
	}
	.meta {
		display: flex;
		gap: var(--space-2);
		padding-inline: var(--space-3);
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		color: var(--color-text-secondary);
	}
	.author {
		font-weight: var(--weight-medium);
	}
	.time {
		font-variant-numeric: tabular-nums;
	}
	.bubble {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-lg);
		border-end-start-radius: var(--radius-xs);
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		box-shadow: inset 0 1px 0 var(--color-highlight);
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		overflow-wrap: anywhere;
	}
	[data-own='true'] .bubble {
		border-end-start-radius: var(--radius-lg);
		border-end-end-radius: var(--radius-xs);
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--white) 24%, var(--color-accent)),
			var(--color-accent) 80%
		);
		border-color: color-mix(in oklab, var(--white) 32%, var(--color-accent));
		color: var(--color-text-on-accent);
	}
</style>
