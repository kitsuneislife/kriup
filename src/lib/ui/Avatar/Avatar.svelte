<script lang="ts">
	import type { Size } from '../types';

	type Props = {
		name: string;
		src?: string;
		size?: Size;
	};

	let { name, src, size = 'md' }: Props = $props();

	// Same name, same color, everywhere: hash of the name picks one of the system colors.
	const colors = ['blue', 'indigo', 'purple', 'pink', 'orange', 'teal', 'green', 'brown'] as const;
	const color = $derived(
		colors[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length]
	);
	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('')
	);
</script>

<span class="avatar" data-size={size} data-color={color} role="img" aria-label={name}>
	{#if src}
		<img {src} alt="" loading="lazy" />
	{:else}
		<span aria-hidden="true">{initials}</span>
	{/if}
</span>

<style>
	.avatar {
		display: inline-grid;
		place-items: center;
		flex: none;
		inline-size: var(--_s);
		block-size: var(--_s);
		border-radius: var(--radius-pill);
		overflow: hidden;
		color: var(--color-text-on-accent);
		font-size: var(--_font);
		font-weight: var(--weight-semibold);
		line-height: 1;
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--white) 20%, var(--_c)),
			var(--_c)
		);
		box-shadow:
			inset 0 0 0 var(--border-width) color-mix(in oklab, var(--white) 25%, var(--_c)),
			0 0 0 var(--border-width) var(--color-hairline);
	}
	img {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
	}
	[data-size='sm'] {
		--_s: var(--control-sm);
		--_font: var(--text-caption-size);
	}
	[data-size='md'] {
		--_s: var(--control-md);
		--_font: var(--text-footnote-size);
	}
	[data-size='lg'] {
		--_s: var(--control-lg);
		--_font: var(--text-subhead-size);
	}
	[data-color='blue'] {
		--_c: var(--blue);
	}
	[data-color='indigo'] {
		--_c: var(--indigo);
	}
	[data-color='purple'] {
		--_c: var(--purple);
	}
	[data-color='pink'] {
		--_c: var(--pink);
	}
	[data-color='orange'] {
		--_c: var(--orange);
	}
	[data-color='teal'] {
		--_c: var(--teal);
	}
	[data-color='green'] {
		--_c: var(--green);
	}
	[data-color='brown'] {
		--_c: var(--brown);
	}
</style>
