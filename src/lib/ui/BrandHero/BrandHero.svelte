<script lang="ts">
	import { textOn } from '../ColorField/hex';

	type Props = {
		title: string;
		subtitle: string;
		/** Text of the call to action, shown in the brand color. */
		cta: string;
		/** The producer's `#rrggbb`; the call to action text turns black or white to stay readable. */
		color: string;
		/** Font family name; falls back to the system font when the browser does not have it. */
		font: string;
		logoUrl?: string | null;
	};

	let { title, subtitle, cta, color, font, logoUrl }: Props = $props();
</script>

<div class="hero" style:--_brand={color} style:--_on-brand={textOn(color)} style:--_font={font}>
	{#if logoUrl}<img class="logo" src={logoUrl} alt="" />{/if}
	<p class="title">{title}</p>
	<p class="subtitle">{subtitle}</p>
	<span class="cta">{cta}</span>
</div>

<style>
	.hero {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-bg-app);
		box-shadow: inset 0 0 0 var(--border-width) var(--color-hairline);
		border-block-start: var(--space-1) solid var(--_brand);
		font-family: var(--_font), var(--font-sans);
		overflow-wrap: anywhere;
	}
	.logo {
		max-block-size: var(--space-8);
		max-inline-size: 50%;
		object-fit: contain;
	}
	.title {
		margin: 0;
		font-size: var(--text-title2-size);
		line-height: var(--text-title2-leading);
		font-weight: var(--weight-bold);
	}
	.subtitle {
		margin: 0;
		color: var(--color-text-secondary);
	}
	.cta {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-pill);
		background: var(--_brand);
		color: var(--_on-brand);
		font-weight: var(--weight-medium);
	}
</style>
