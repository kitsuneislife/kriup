<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../Button/Button.svelte';

	type Props = {
		open?: boolean;
		title: string;
		/** Label of the close button, for screen readers. */
		closeLabel: string;
		children: Snippet;
		/** Action row at the bottom: Cancel and the confirm Button. */
		footer?: Snippet;
	};

	let { open = $bindable(false), title, closeLabel, children, footer }: Props = $props();

	const titleId = $props.id();
	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	onclose={() => (open = false)}
	onclick={(event) => {
		if (event.target === dialog) open = false;
	}}
>
	<div class="shell">
		<div class="surface">
			<header class="header">
				<h2 id={titleId} class="title">{title}</h2>
				<Button
					variant="ghost"
					size="sm"
					icon="x"
					label={closeLabel}
					onclick={() => (open = false)}
				/>
			</header>
			<div class="body">{@render children()}</div>
			{#if footer}<footer class="footer">{@render footer()}</footer>{/if}
		</div>
	</div>
</dialog>

<style>
	dialog {
		inline-size: min(var(--width-dialog), calc(100% - var(--space-8)));
		max-block-size: calc(100dvh - var(--space-8));
		padding: 0;
		border: 0;
		background: none;
		color: var(--color-text);
		overflow: visible;
		/* enter and exit with opacity and transform only */
		opacity: 0;
		transform: translateY(var(--shift)) scale(0.98);
		transition:
			opacity var(--duration-base) var(--ease-exit),
			transform var(--duration-base) var(--ease-exit),
			overlay var(--duration-base) allow-discrete,
			display var(--duration-base) allow-discrete;
	}
	dialog[open] {
		opacity: 1;
		transform: none;
		transition-timing-function: var(--ease-enter);
	}
	@starting-style {
		dialog[open] {
			opacity: 0;
			transform: translateY(var(--shift)) scale(0.98);
		}
	}
	dialog::backdrop {
		background: var(--color-bg-overlay);
		backdrop-filter: blur(var(--blur-overlay));
		opacity: 0;
		transition:
			opacity var(--duration-base) var(--ease-standard),
			overlay var(--duration-base) allow-discrete,
			display var(--duration-base) allow-discrete;
	}
	dialog[open]::backdrop {
		opacity: 1;
	}
	@starting-style {
		dialog[open]::backdrop {
			opacity: 0;
		}
	}

	/* same double border as Card frame, one step larger */
	.shell {
		padding: var(--space-1);
		border-radius: var(--radius-xl);
		background: var(--color-bg-app);
		border: var(--border-width) solid var(--color-border);
		box-shadow: var(--shadow-3);
	}
	.surface {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-6);
		border-radius: calc(var(--radius-xl) - var(--space-1));
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		box-shadow: inset 0 1px 0 var(--color-highlight);
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}
	.title {
		font-size: var(--text-title3-size);
		line-height: var(--text-title3-leading);
		letter-spacing: var(--text-title3-tracking);
		font-weight: var(--weight-semibold);
	}
	.body {
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		color: var(--color-text-secondary);
	}
	.footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}
</style>
