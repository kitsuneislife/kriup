<script lang="ts">
	type Props = {
		/** 0 to 100. Leave it out for an indeterminate bar. */
		value?: number;
		/** Accessible name, for example "Upload". */
		label: string;
		tone?: 'accent' | 'success' | 'warning' | 'danger';
	};

	let { value, label, tone = 'accent' }: Props = $props();

	const clamped = $derived(value === undefined ? undefined : Math.min(100, Math.max(0, value)));
</script>

<div
	class="progress"
	role="progressbar"
	aria-label={label}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={clamped}
	data-tone={tone}
	data-indeterminate={clamped === undefined}
	style:--ratio={clamped === undefined ? 0.4 : clamped / 100}
>
	<span class="bar"></span>
</div>

<style>
	.progress {
		overflow: hidden;
		block-size: var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--color-fill);
	}
	.bar {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, color-mix(in oklab, var(--white) 22%, var(--_c)), var(--_c));
		transform-origin: left center;
		transform: scaleX(var(--ratio));
		transition: transform var(--duration-slow) var(--ease-standard);
	}
	[data-indeterminate='true'] .bar {
		animation: slide 1.3s var(--ease-standard) infinite;
	}
	[data-tone='accent'] {
		--_c: var(--color-accent);
	}
	[data-tone='success'] {
		--_c: var(--color-success);
	}
	[data-tone='warning'] {
		--_c: var(--color-warning);
	}
	[data-tone='danger'] {
		--_c: var(--color-danger);
	}
	@keyframes slide {
		from {
			transform: translateX(-100%) scaleX(var(--ratio));
		}
		to {
			transform: translateX(100%) scaleX(var(--ratio));
		}
	}
</style>
