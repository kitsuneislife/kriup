<script lang="ts">
	type Props = {
		shape?: 'text' | 'block' | 'circle';
		/** Block height, taken from the control scale. */
		size?: 'sm' | 'md' | 'lg';
		/** Text lines. The last one is shorter, like real text. */
		lines?: number;
	};

	let { shape = 'text', size = 'md', lines = 1 }: Props = $props();
</script>

{#if shape === 'text'}
	<span class="lines" aria-hidden="true">
		{#each Array.from({ length: lines }, (_, line) => line) as index (index)}
			<span class="bone" data-shape="text" data-last={index === lines - 1 && lines > 1}></span>
		{/each}
	</span>
{:else}
	<span class="bone" data-shape={shape} aria-hidden="true" style:--h="var(--control-{size})"></span>
{/if}

<style>
	/* text lines fill the available width, also inside a row (flex: 1 there, full width in a column) */
	.lines {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: var(--space-2);
		inline-size: 100%;
		min-inline-size: 0;
	}
	.bone {
		position: relative;
		display: block;
		overflow: hidden;
		background: var(--color-fill);
		border-radius: var(--radius-sm);
	}
	[data-shape='text'] {
		block-size: 1em;
		font-size: var(--text-body-size);
	}
	[data-last='true'] {
		inline-size: 60%;
	}
	[data-shape='block'] {
		block-size: calc(var(--h) * 2);
		border-radius: var(--radius-md);
	}
	[data-shape='circle'] {
		inline-size: var(--h);
		block-size: var(--h);
		border-radius: var(--radius-pill);
	}
	/* the shimmer is a gradient that only moves with transform */
	.bone::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, var(--color-fill-subtle), transparent);
		transform: translateX(-100%);
		animation: shimmer 1.4s var(--ease-standard) infinite;
	}
	@keyframes shimmer {
		to {
			transform: translateX(100%);
		}
	}
</style>
