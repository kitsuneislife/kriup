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
	<span class="icon"><Icon name={icons[tone]} /></span>
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
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--_c) 11%, var(--color-bg-raised));
		border: var(--border-width) solid color-mix(in srgb, var(--_c) 32%, transparent);
		box-shadow: inset 0 1px 0 var(--color-highlight);
		animation: enter var(--duration-base) var(--ease-enter) both;
	}
	.icon {
		display: inline-flex;
		padding-block: 0.125rem;
		color: var(--_c);
	}
	.body {
		flex: 1;
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
