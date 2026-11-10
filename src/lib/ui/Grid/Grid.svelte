<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Size, Space } from '../types';

	type Props = {
		/** Minimum column width; columns fill the row and wrap by themselves. */
		min?: Size;
		gap?: Space;
		as?: 'div' | 'ul' | 'ol';
		children: Snippet;
	};

	let { min = 'md', gap = 4, as = 'div', children }: Props = $props();
</script>

<svelte:element
	this={as}
	class="grid"
	style:--gap="var(--space-{gap})"
	style:--min="var(--width-column-{min})"
>
	{@render children()}
</svelte:element>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(var(--min), 100%), 1fr));
		gap: var(--gap);
	}
</style>
