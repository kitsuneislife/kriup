<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Align, Justify, Space } from '../types';

	type Props = {
		gap?: Space;
		align?: Align | 'baseline';
		justify?: Justify;
		wrap?: boolean;
		as?: 'div' | 'ul' | 'nav' | 'header' | 'footer';
		children: Snippet;
	};

	let {
		gap = 2,
		align = 'center',
		justify = 'start',
		wrap = true,
		as = 'div',
		children
	}: Props = $props();
</script>

<svelte:element
	this={as}
	class="cluster"
	data-align={align}
	data-justify={justify}
	data-wrap={wrap}
	style:--gap="var(--space-{gap})"
>
	{@render children()}
</svelte:element>

<style>
	.cluster {
		display: flex;
		gap: var(--gap);
		min-width: 0;
	}
	[data-wrap='true'] {
		flex-wrap: wrap;
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
	[data-align='baseline'] {
		align-items: baseline;
	}
	[data-justify='center'] {
		justify-content: center;
	}
	[data-justify='end'] {
		justify-content: flex-end;
	}
	[data-justify='between'] {
		justify-content: space-between;
	}
</style>
