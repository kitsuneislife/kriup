<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Align, Space } from '../types';

	type Props = {
		gap?: Space;
		align?: Align;
		as?: 'div' | 'section' | 'ul' | 'ol' | 'nav' | 'main' | 'header' | 'footer' | 'form';
		children: Snippet;
	};

	let { gap = 4, align = 'stretch', as = 'div', children }: Props = $props();
</script>

<svelte:element this={as} class="stack" data-align={align} style:--gap="var(--space-{gap})">
	{@render children()}
</svelte:element>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		min-width: 0;
	}
	[data-align='start'] {
		align-items: flex-start;
	}
	[data-align='center'] {
		align-items: center;
	}
	[data-align='end'] {
		align-items: flex-end;
	}
	[data-align='stretch'] {
		align-items: stretch;
	}
</style>
