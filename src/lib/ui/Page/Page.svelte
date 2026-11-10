<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		width?: 'text' | 'page';
		children: Snippet;
	};

	let { width = 'page', children }: Props = $props();
</script>

<div class="page" style:--max="var(--width-{width})">
	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	/* Centers without margin: side tracks share the leftover space and keep a minimum gutter. */
	.page {
		display: grid;
		grid-template-columns: minmax(var(--space-4), 1fr) minmax(0, var(--max)) minmax(
				var(--space-4),
				1fr
			);
		padding-block: var(--space-8);
	}
	.content {
		grid-column: 2;
		min-width: 0;
		animation: enter var(--duration-slow) var(--ease-enter) both;
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(var(--shift));
		}
	}
</style>
