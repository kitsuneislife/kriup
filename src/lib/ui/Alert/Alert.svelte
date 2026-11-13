<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/icons';

	type Tone = 'info' | 'success' | 'warning' | 'danger';

	type Props = {
		tone?: Tone;
		title?: string;
		children: Snippet;
		/** Action area on the right, usually a small Button. */
		action?: Snippet;
	};

	let { tone = 'info', title, children, action }: Props = $props();

	const icons: Record<Tone, IconName> = {
		info: 'info',
		success: 'check-circle',
		warning: 'alert',
		danger: 'x-circle'
	};
</script>

<div
	class="alert"
	data-tone={tone}
	role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
>
	<span class="icon"><Icon name={icons[tone]} size="sm" /></span>
	<div class="body">
		{#if title}<p class="title">{title}</p>{/if}
		<div class="message">{@render children()}</div>
	</div>
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.alert {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-3);
		border-radius: var(--radius-lg);
		/*
		 * Neutral surface, like a macOS notification: the tone lives in a solid icon tile and in
		 * a soft light that spreads from it, never as a wash over the whole card.
		 */
		background:
			radial-gradient(
				circle at var(--space-6) var(--space-6),
				color-mix(in srgb, var(--_c) 14%, transparent),
				transparent 9rem
			),
			var(--surface, var(--color-bg-raised));
		border: var(--border-width) solid var(--color-border);
		box-shadow:
			inset 0 1px 0 var(--color-highlight),
			0 0 0 var(--border-width) var(--color-edge),
			var(--shadow-1);
		animation: enter var(--duration-base) var(--ease-enter) backwards;
	}
	.icon {
		display: grid;
		place-items: center;
		flex: none;
		inline-size: var(--control-sm);
		block-size: var(--control-sm);
		border-radius: var(--radius-sm);
		color: var(--white);
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--_c) 88%, var(--white)),
			color-mix(in oklab, var(--_c) 88%, var(--black))
		);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.25),
			inset 0 0 0 var(--border-width) rgb(255 255 255 / 0.08),
			0 2px 8px -2px color-mix(in srgb, var(--_c) 60%, transparent);
	}
	.body {
		flex: 1;
		align-self: center;
		min-width: 0;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	.title {
		font-weight: var(--weight-semibold);
	}
	.message {
		color: var(--color-text-secondary);
	}
	.action {
		flex: none;
		align-self: center;
	}
	[data-tone='info'] {
		--_c: var(--color-accent);
	}
	[data-tone='success'] {
		--_c: var(--color-success);
	}
	[data-tone='warning'] {
		--_c: var(--color-warning);
	}
	[data-tone='danger'] {
		--_c: var(--color-danger);
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(var(--shift));
		}
	}
</style>
