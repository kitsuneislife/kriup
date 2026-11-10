<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Props = {
		/** CSS variable to show, for example `--blue`. */
		token: string;
		/** Display name, for example `Blue`. Without it the swatch is only the tile. */
		name?: string;
		/** R G B of the light value, for example `0 136 255`. */
		light?: string;
		/** R G B of the dark value. */
		dark?: string;
		/** What the color means in the system, one short line. */
		use?: string;
		size?: 'sm' | 'md';
	};

	let { token, name, light, dark, use, size = 'md' }: Props = $props();
</script>

<!-- The tile is split: left half resolves the token in light, right half in dark. -->
<figure class="swatch" data-size={size}>
	<span class="tile" style:--c="var({token})">
		<span class="half" style:color-scheme="light"></span>
		<span class="half" style:color-scheme="dark"></span>
	</span>
	{#if name}
		<figcaption class="caption">
			<span class="heading">
				<span class="name">{name}</span>
				<code class="token">{token}</code>
			</span>
			{#if light || dark}
				<span class="values">
					{#if light}<span class="value"><Icon name="sun" size="sm" />{light}</span>{/if}
					{#if dark}<span class="value"><Icon name="moon" size="sm" />{dark}</span>{/if}
				</span>
			{/if}
			{#if use}<span class="use">{use}</span>{/if}
		</figcaption>
	{/if}
</figure>

<style>
	.swatch {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin: 0;
		min-width: 0;
	}
	.tile {
		display: grid;
		grid-template-columns: 1fr 1fr;
		overflow: hidden;
		block-size: var(--_h);
		border-radius: var(--radius-lg);
		box-shadow:
			0 0 0 var(--border-width) var(--color-hairline),
			var(--shadow-1);
		transition: transform var(--duration-base) var(--ease-spring);
	}
	.swatch:hover .tile {
		transform: translateY(calc(var(--shift) / -4));
	}
	[data-size='md'] {
		--_h: calc(var(--control-lg) * 2);
	}
	[data-size='sm'] {
		--_h: var(--control-lg);
	}
	[data-size='sm'] .tile {
		border-radius: var(--radius-md);
	}
	.half {
		background: var(--c);
	}
	/* a hairline where the two themes meet, so equal values still read as two halves */
	.half + .half {
		box-shadow: inset var(--border-width) 0 0 var(--color-hairline);
	}

	.caption {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}
	.heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
	}
	.name {
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		font-weight: var(--weight-semibold);
	}
	.token {
		font-family: var(--font-mono);
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		color: var(--color-text-tertiary);
	}
	.values {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
	}
	.value {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-family: var(--font-mono);
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.value :global(svg) {
		color: var(--color-text-tertiary);
	}
	.use {
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		letter-spacing: var(--text-footnote-tracking);
		color: var(--color-text-secondary);
	}
</style>
