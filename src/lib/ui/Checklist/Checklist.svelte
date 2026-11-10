<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Item = {
		label: string;
		done: boolean;
		/** Where to fix a pending item. Done items need none. */
		href?: string;
		/** Why it is pending, for example "Falta o CPF". */
		reason?: string;
	};

	type Props = {
		label: string;
		items: Item[];
		/** Text of the progress line, for example `(done, total) => `${done} de ${total}``. */
		count?: (done: number, total: number) => string;
	};

	let { label, items, count }: Props = $props();

	const done = $derived(items.filter((item) => item.done).length);
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- href comes from the caller, already resolved -->
<div class="checklist">
	{#if count}
		<div class="head">
			<span>{count(done, items.length)}</span>
			<span class="meter" aria-hidden="true">
				<span class="fill" style:--p={items.length ? done / items.length : 0}></span>
			</span>
		</div>
	{/if}
	<ul class="list" aria-label={label}>
		{#each items as item (item.label)}
			<li class="item" data-done={item.done} data-link={!!item.href && !item.done}>
				<span class="mark">
					{#if item.done}<Icon name="check" size="sm" />{/if}
				</span>
				<span class="text">
					{#if item.href && !item.done}
						<a class="link" href={item.href}>{item.label}</a>
					{:else}
						<span class="label">{item.label}</span>
					{/if}
					{#if item.reason && !item.done}
						<span class="reason"><Icon name="alert" size="sm" />{item.reason}</span>
					{/if}
				</span>
				{#if item.href && !item.done}<span class="go"><Icon name="chevron-right" size="sm" /></span
					>{/if}
			</li>
		{/each}
	</ul>
</div>

<!-- eslint-enable svelte/no-navigation-without-resolve -->

<style>
	.checklist {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	/* how far along, read at a glance */
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-inline: var(--space-3);
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		font-variant-numeric: tabular-nums;
	}
	.meter {
		flex: 1;
		block-size: 0.25rem;
		overflow: hidden;
		border-radius: var(--radius-pill);
		background: var(--color-fill);
	}
	.fill {
		display: block;
		block-size: 100%;
		border-radius: inherit;
		background: var(--color-success);
		transform: scaleX(var(--p));
		transform-origin: left;
		transition: transform var(--duration-slow) var(--ease-standard);
	}
	.list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.item {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		transition: background-color var(--duration-fast) var(--ease-standard);
	}
	/* alternating rows, as in Mac lists */
	.item:nth-child(even) {
		background: var(--color-row-alt);
	}
	[data-link='true']:hover {
		background: var(--color-fill-subtle);
	}
	.mark {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: var(--icon-md);
		block-size: var(--icon-md);
		border-radius: var(--radius-pill);
		border: 1.5px dashed var(--color-border-strong);
		color: var(--color-text-on-accent);
	}
	[data-done='true'] .mark {
		border: var(--border-width) solid color-mix(in oklab, var(--color-success) 70%, var(--white));
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--color-success) 90%, var(--white)),
			color-mix(in oklab, var(--color-success) 88%, var(--black))
		);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.25),
			0 1px 3px color-mix(in srgb, var(--color-success) 40%, transparent);
	}
	[data-done='true'] .mark :global(svg) {
		animation: pop var(--duration-base) var(--ease-spring) both;
	}
	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-inline-size: 0;
	}
	[data-done='true'] .label {
		text-decoration: line-through;
		text-decoration-color: var(--color-text-tertiary);
	}
	[data-done='false'] {
		color: var(--color-text);
	}
	.link {
		color: inherit;
		font-weight: var(--weight-medium);
		text-decoration: none;
	}
	/* the whole row is the link's hit area */
	.link::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}
	.reason {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: light-dark(
			color-mix(in oklab, var(--color-warning) 70%, var(--black)),
			var(--color-warning)
		);
		font-size: var(--text-footnote-size);
	}
	.go {
		display: inline-flex;
		color: var(--color-text-tertiary);
		transition:
			transform var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard);
	}
	[data-link='true']:hover .go {
		color: var(--color-text-secondary);
		transform: translateX(2px);
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.4);
		}
	}
</style>
