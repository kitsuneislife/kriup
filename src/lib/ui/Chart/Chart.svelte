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
	const last = $derived(points.at(-1));
	const gradient = $props.id();
</script>

<figure class="chart" style:--_c={toneVar[tone]}>
	{#if kind === 'line'}
		<div class="plot">
			<svg
				class="line"
				viewBox="0 0 {width} {height}"
				preserveAspectRatio="none"
				role="img"
				aria-label={label}
			>
				<defs>
					<linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" style="stop-color: var(--_c); stop-opacity: 0.28" />
						<stop offset="1" style="stop-color: var(--_c); stop-opacity: 0" />
					</linearGradient>
				</defs>
				{#each [0.25, 0.5, 0.75] as y (y)}
					<line
						class="grid"
						x1="0"
						x2={width}
						y1={height * y}
						y2={height * y}
						vector-effect="non-scaling-stroke"
					/>
				{/each}
				<path class="area" d={area} fill="url(#{gradient})" />
				<path class="stroke" d={line} vector-effect="non-scaling-stroke" />
			</svg>
			<!-- the latest value, a dot outside the stretched svg so it stays round -->
			{#if last}
				<span
					class="end"
					style:--x="{(last[0] / width) * 100}%"
					style:--y="{(last[1] / height) * 100}%"
				></span>
			{/if}
		</div>
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
					<span class="track"
						><span class="bar" style:--h={(heights[index] ?? 0) / 100} style:--i={index}
						></span></span
					>
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
	.plot {
		position: relative;
	}
	/* the line reveals itself from the left */
	.line {
		inline-size: 100%;
		block-size: var(--space-16);
		overflow: visible;
		animation: reveal 0.8s var(--ease-standard) both;
	}
	.grid {
		stroke: var(--color-hairline);
		stroke-width: 1;
		stroke-dasharray: 2 4;
	}
	.stroke {
		fill: none;
		stroke: var(--_c);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.end {
		position: absolute;
		inset-inline-start: var(--x);
		inset-block-start: var(--y);
		inline-size: 0.5rem;
		block-size: 0.5rem;
		border-radius: var(--radius-pill);
		background: var(--_c);
		box-shadow:
			0 0 0 2px var(--color-bg-raised),
			0 0 0 5px color-mix(in srgb, var(--_c) 25%, transparent);
		transform: translate(-50%, -50%);
		animation: fade var(--duration-base) var(--ease-enter) both;
		animation-delay: 0.7s;
	}
	@keyframes reveal {
		from {
			clip-path: inset(-10% 100% -10% 0);
		}
		to {
			clip-path: inset(-10% 0 -10% 0);
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.line,
		.end {
			animation: none;
		}
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
	/* each bar stands in a faint track, so short values still read as part of a whole */
	.track {
		display: flex;
		flex: 1;
		inline-size: 100%;
		border-radius: var(--radius-xs);
		background: var(--color-row-alt);
	}
	/* the bar grows with transform, never with height */
	.bar {
		inline-size: 100%;
		flex: 1;
		border-radius: var(--radius-xs);
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--white) 20%, var(--_c)),
			color-mix(in oklab, var(--black) 8%, var(--_c))
		);
		box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.25);
		transform: scaleY(var(--h));
		transform-origin: bottom;
		animation: grow var(--duration-slow) var(--ease-enter) both;
		animation-delay: calc(var(--i) * 30ms);
		transition: opacity var(--duration-fast) var(--ease-standard);
	}
	/* hovering one bar dims the rest */
	.bars:hover .bar {
		opacity: 0.45;
	}
	.bars .column:hover .bar {
		opacity: 1;
	}
	.column:hover .tick {
		color: var(--color-text);
	}
	@keyframes grow {
		from {
			transform: scaleY(0);
		}
	}
</style>
