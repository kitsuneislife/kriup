<script lang="ts">
	import type { Tone } from '../types';
	import { toneVar } from '../types';
	import { barHeights, linePoints } from './scale';

	type Props = {
		/** What the chart shows, read by screen readers: "Vendas dos últimos 7 dias". */
		label: string;
		values: number[];
		/** One per value. Shown under the bars, or in the title of each point of the line. */
		labels?: string[];
		kind?: 'line' | 'bar';
		/** Blue by default. Use a color only when it carries meaning (green for paid, indigo for refunds). */
		tone?: Tone;
		/** Text of a value, for the tooltip of each bar. */
		format?: (value: number) => string;
	};

	let { label, values, labels, kind = 'line', tone = 'accent', format = String }: Props = $props();

	const width = 100;
	const height = 32;
	const points = $derived(linePoints(values, width, height));
	const line = $derived(points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(''));
	const area = $derived(points.length ? `${line}L${width} ${height}L0 ${height}Z` : '');
	const heights = $derived(barHeights(values));
</script>

<figure class="chart" style:--_c={toneVar[tone]}>
	{#if kind === 'line'}
		<svg
			class="line"
			viewBox="0 0 {width} {height}"
			preserveAspectRatio="none"
			role="img"
			aria-label={label}
		>
			<path class="area" d={area} />
			<path class="stroke" d={line} vector-effect="non-scaling-stroke" />
		</svg>
		{#if labels}
			<figcaption class="ends">
				<span>{labels[0]}</span>
				<span>{labels.at(-1)}</span>
			</figcaption>
		{/if}
	{:else}
		<div class="bars" role="img" aria-label={label}>
			{#each values as value, index (index)}
				<div class="column" title={`${labels?.[index] ?? ''} ${format(value)}`.trim()}>
					<span class="bar" style:--h={(heights[index] ?? 0) / 100}></span>
					{#if labels}<span class="tick">{labels[index]}</span>{/if}
				</div>
			{/each}
		</div>
	{/if}
</figure>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
	}
	.line {
		inline-size: 100%;
		block-size: var(--space-12);
		overflow: visible;
	}
	.area {
		fill: color-mix(in srgb, var(--_c) 14%, transparent);
	}
	.stroke {
		fill: none;
		stroke: var(--_c);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.ends,
	.tick {
		color: var(--color-text-secondary);
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		font-variant-numeric: tabular-nums;
	}
	.ends {
		display: flex;
		justify-content: space-between;
	}
	.bars {
		display: flex;
		align-items: flex-end;
		gap: var(--space-2);
		block-size: var(--space-16);
	}
	.column {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: var(--space-1);
		block-size: 100%;
		min-inline-size: 0;
	}
	/* the bar grows with transform, never with height */
	.bar {
		inline-size: 100%;
		flex: 1;
		border-radius: var(--radius-xs) var(--radius-xs) 0 0;
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--white) 20%, var(--_c)),
			var(--_c)
		);
		transform: scaleY(var(--h));
		transform-origin: bottom;
		animation: grow var(--duration-slow) var(--ease-enter) both;
	}
	@keyframes grow {
		from {
			transform: scaleY(0);
		}
	}
</style>
