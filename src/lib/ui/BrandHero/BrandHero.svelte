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
		/**
		 * `preview` (the wizard) shows a still picture; `page` is the top of the public sales
		 * page: bigger, the title is the page's h1 and the call to action goes to `href`.
		 */
		size?: 'preview' | 'page';
		href?: string;
	};

	let { title, subtitle, cta, color, font, logoUrl, size = 'preview', href }: Props = $props();
</script>

<div
	class="hero"
	data-size={size}
	style:--_brand={color}
	style:--_on-brand={textOn(color)}
	style:--_font={font}
>
	{#if logoUrl}<img class="logo" src={logoUrl} alt="" />{/if}
	<svelte:element this={size === 'page' ? 'h1' : 'p'} class="title">{title}</svelte:element>
	<p class="subtitle">{subtitle}</p>
	{#if href}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href comes from the caller, already resolved -->
		<a class="cta" {href}>{cta}</a>
	{:else}
		<span class="cta">{cta}</span>
	{/if}
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
		text-decoration: none;
	}

	/* the public page: a calm wash of the brand behind a large title */
	[data-size='page'] {
		gap: var(--space-4);
		padding: var(--space-12) var(--space-6);
		background:
			radial-gradient(
				120% 90% at 0% 0%,
				color-mix(in srgb, var(--_brand) 16%, transparent),
				transparent 70%
			),
			var(--color-bg-raised);
	}
	[data-size='page'] .logo {
		max-block-size: var(--space-12);
	}
	[data-size='page'] .title {
		font-size: var(--text-large-size);
		line-height: var(--text-large-leading);
		letter-spacing: var(--text-large-tracking);
	}
	[data-size='page'] .subtitle {
		font-size: var(--text-title3-size);
		line-height: var(--text-title3-leading);
		max-inline-size: 36rem;
	}
	[data-size='page'] .cta {
		margin-block-start: var(--space-2);
		padding: var(--space-3) var(--space-6);
		font-size: var(--text-body-size);
		font-weight: var(--weight-semibold);
		box-shadow: 0 var(--space-1) var(--space-4) color-mix(in srgb, var(--_brand) 35%, transparent);
		transition:
			transform var(--duration-fast) var(--ease-standard),
			box-shadow var(--duration-fast) var(--ease-standard);
	}
	a.cta:hover {
		transform: translateY(-1px);
		box-shadow: 0 var(--space-2) var(--space-6) color-mix(in srgb, var(--_brand) 45%, transparent);
	}
	@media (min-width: 48rem) {
		[data-size='page'] {
			padding: var(--space-16) var(--space-12);
		}
		[data-size='page'] .title {
			font-size: var(--text-display-size);
			line-height: var(--text-display-leading);
			letter-spacing: var(--text-display-tracking);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		a.cta:hover {
			transform: none;
		}
	}
</style>
