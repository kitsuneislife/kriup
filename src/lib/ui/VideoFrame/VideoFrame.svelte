<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';

	type Props = {
		/** Name of the lesson, read by screen readers. */
		title: string;
		/** The player (a video or an iframe). Without it a placeholder with a play icon shows. */
		children?: Snippet;
	};

	let { title, children }: Props = $props();
</script>

<figure class="frame" aria-label={title}>
	{#if children}
		{@render children()}
	{:else}
		<span class="placeholder"><Icon name="play" size="lg" /></span>
	{/if}
</figure>

<style>
	.frame {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 9;
		margin: 0;
		overflow: hidden;
		border-radius: var(--radius-lg);
		background: var(--black);
		border: var(--border-width) solid var(--color-border);
		box-shadow: var(--shadow-2);
	}
	.frame :global(video),
	.frame :global(iframe) {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		border: 0;
	}
	.placeholder {
		display: grid;
		place-items: center;
		inline-size: var(--control-lg);
		block-size: var(--control-lg);
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--white) 18%, transparent);
		color: var(--white);
		backdrop-filter: blur(var(--blur-overlay));
	}
</style>
