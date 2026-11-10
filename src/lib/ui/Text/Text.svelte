<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant =
		| 'caption'
		| 'footnote'
		| 'subhead'
		| 'body'
		| 'title3'
		| 'title2'
		| 'title1'
		| 'large'
		| 'display';

	type Props = {
		variant?: Variant;
		/** Overrides the weight of the variant (titles are semibold, the rest regular). */
		weight?: 'regular' | 'medium' | 'semibold' | 'bold';
		tone?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'warning' | 'danger';
		as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'strong' | 'em' | 'code';
		/** Tabular figures: use for money, dates and columns of numbers. */
		numeric?: boolean;
		truncate?: boolean;
		children: Snippet;
	};

	let {
		variant = 'body',
		weight,
		tone = 'primary',
		as = 'p',
		numeric = false,
		truncate = false,
		children
	}: Props = $props();
</script>

<svelte:element
	this={as}
	class="text"
	data-variant={variant}
	data-weight={weight}
	data-tone={tone}
	data-numeric={numeric}
	data-truncate={truncate}
>
	{@render children()}
</svelte:element>

<style>
	.text {
		color: var(--tone, var(--color-text));
		font-size: var(--size);
		line-height: var(--leading);
		letter-spacing: var(--tracking);
		font-weight: var(--weight, var(--weight-regular));
		transition: color var(--duration-base) var(--ease-standard);
	}

	[data-variant='caption'] {
		--size: var(--text-caption-size);
		--leading: var(--text-caption-leading);
		--tracking: var(--text-caption-tracking);
	}
	[data-variant='footnote'] {
		--size: var(--text-footnote-size);
		--leading: var(--text-footnote-leading);
		--tracking: var(--text-footnote-tracking);
	}
	[data-variant='subhead'] {
		--size: var(--text-subhead-size);
		--leading: var(--text-subhead-leading);
		--tracking: var(--text-subhead-tracking);
	}
	[data-variant='body'] {
		--size: var(--text-body-size);
		--leading: var(--text-body-leading);
		--tracking: var(--text-body-tracking);
	}
	[data-variant='title3'] {
		--size: var(--text-title3-size);
		--leading: var(--text-title3-leading);
		--tracking: var(--text-title3-tracking);
		--weight: var(--weight-semibold);
	}
	[data-variant='title2'] {
		--size: var(--text-title2-size);
		--leading: var(--text-title2-leading);
		--tracking: var(--text-title2-tracking);
		--weight: var(--weight-semibold);
	}
	[data-variant='title1'] {
		--size: var(--text-title1-size);
		--leading: var(--text-title1-leading);
		--tracking: var(--text-title1-tracking);
		--weight: var(--weight-semibold);
	}
	[data-variant='large'] {
		--size: var(--text-large-size);
		--leading: var(--text-large-leading);
		--tracking: var(--text-large-tracking);
		--weight: var(--weight-bold);
	}
	[data-variant='display'] {
		--size: var(--text-display-size);
		--leading: var(--text-display-leading);
		--tracking: var(--text-display-tracking);
		--weight: var(--weight-bold);
	}

	[data-weight='regular'] {
		--weight: var(--weight-regular);
	}
	[data-weight='medium'] {
		--weight: var(--weight-medium);
	}
	[data-weight='semibold'] {
		--weight: var(--weight-semibold);
	}
	[data-weight='bold'] {
		--weight: var(--weight-bold);
	}

	[data-tone='secondary'] {
		--tone: var(--color-text-secondary);
	}
	[data-tone='tertiary'] {
		--tone: var(--color-text-tertiary);
	}
	[data-tone='accent'] {
		--tone: var(--color-accent);
	}
	[data-tone='success'] {
		--tone: light-dark(color-mix(in oklab, var(--black) 42%, var(--green)), var(--green));
	}
	[data-tone='warning'] {
		--tone: light-dark(color-mix(in oklab, var(--black) 38%, var(--orange)), var(--orange));
	}
	[data-tone='danger'] {
		--tone: light-dark(color-mix(in oklab, var(--black) 18%, var(--red)), var(--red));
	}

	[data-numeric='true'] {
		font-variant-numeric: tabular-nums;
	}
	[data-truncate='true'] {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	code.text {
		font-family: var(--font-mono);
	}
</style>
