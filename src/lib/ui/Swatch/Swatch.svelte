<script lang="ts">
	type Props = {
		/** CSS variable to show, for example `--blue`. */
		token: string;
		/** Forces the theme of the tile, so light and dark show side by side. */
		scheme?: 'light' | 'dark';
		/** Text shown next to the tile, for example `R 0  G 136  B 255`. */
		value?: string;
	};

	let { token, scheme, value }: Props = $props();
</script>

<span class="swatch">
	<span class="tile" style:--c="var({token})" style:color-scheme={scheme}></span>
	{#if value}<span class="value">{value}</span>{/if}
</span>

<style>
	.swatch {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
	}
	.tile {
		flex: none;
		inline-size: var(--control-lg);
		block-size: var(--control-lg);
		border-radius: var(--radius-md);
		background: var(--c);
		box-shadow:
			inset 0 0 0 var(--border-width) var(--color-hairline),
			var(--shadow-1);
	}
	.value {
		font-family: var(--font-mono);
		font-size: var(--text-caption-size);
		line-height: var(--text-caption-leading);
		color: var(--color-text-secondary);
		white-space: pre;
	}
</style>
