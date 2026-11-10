<script lang="ts">
	type Props = {
		orientation?: 'horizontal' | 'vertical';
	};

	let { orientation = 'horizontal' }: Props = $props();
</script>

<hr class="divider" data-orientation={orientation} aria-orientation={orientation} />

<style>
	.divider {
		margin: 0;
		border: 0;
		background: var(--color-border);
		flex: none;
	}
	[data-orientation='horizontal'] {
		block-size: var(--border-width);
		inline-size: 100%;
	}
	[data-orientation='vertical'] {
		inline-size: var(--border-width);
		align-self: stretch;
	}
</style>
