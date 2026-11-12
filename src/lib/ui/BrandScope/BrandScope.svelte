<script lang="ts">
	import type { Snippet } from 'svelte';
	import { textOn } from '../ColorField/hex';

	type Props = {
		/** The producer's `#rrggbb`: becomes the accent of everything inside. */
		color: string;
		/** Font family name, loaded from Google Fonts; the system font stays as fallback. */
		font: string;
		children: Snippet;
	};

	let { color, font, children }: Props = $props();

	// Button primary paints the accent mixed to 84% with black (Button.svelte)
	const onAccent = $derived(textOn(color, 0.84));
	const fontHref = $derived(
		`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replaceAll('%20', '+')}:wght@400;500;600;700&display=swap`
	);
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="stylesheet" href={fontHref} />
</svelte:head>

<div
	class="brand"
	style:--color-accent={color}
	style:--color-accent-tint="color-mix(in srgb, {color} 14%, transparent)"
	style:--color-text-on-accent={onAccent}
	style:--focus-color="color-mix(in srgb, {color} 70%, transparent)"
	style:--_font={font}
>
	{@render children()}
</div>

<style>
	.brand {
		display: contents;
		font-family: var(--_font), var(--font-sans);
	}
</style>
