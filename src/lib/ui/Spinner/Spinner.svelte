<script lang="ts">
	import type { Size } from '../types';

	type Props = {
		size?: Size;
		/** Accessible name, for example "Loading". */
		label: string;
	};

	let { size = 'md', label }: Props = $props();
</script>

<span class="spinner" role="status" aria-label={label} style:--size="var(--icon-{size})">
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
	>
		<circle class="track" cx="12" cy="12" r="9" />
		<path d="M21 12a9 9 0 0 0-9-9" />
	</svg>
</span>

<style>
	.spinner {
		display: inline-flex;
		inline-size: var(--size);
		block-size: var(--size);
		color: currentColor;
		/* appears only after a short delay, so fast responses never flash it */
		animation: show var(--duration-fast) var(--ease-enter) 150ms both;
	}
	svg {
		inline-size: 100%;
		block-size: 100%;
		animation: spin 0.8s linear infinite;
	}
	.track {
		opacity: 0.2;
	}
	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}
	@keyframes show {
		from {
			opacity: 0;
		}
	}
</style>
