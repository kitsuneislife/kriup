<script lang="ts">
	import { flip } from 'svelte/animate';
	import { cubicIn, quintOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly, scale } from 'svelte/transition';
	import Alert from '../Alert/Alert.svelte';
	import Button from '../Button/Button.svelte';
	import { dismiss, toasts } from './store.svelte';

	// A list that leaves needs JS transitions; durations mirror --duration-slow and --duration-base.
	const slow = $derived(prefersReducedMotion.current ? 150 : 340);
	const base = $derived(prefersReducedMotion.current ? 100 : 220);
	const rise = $derived(prefersReducedMotion.current ? 0 : 24);

	type Props = {
		/** Name of the close button, for screen readers. */
		closeLabel: string;
	};

	let { closeLabel }: Props = $props();
</script>

<!-- Mount once, in the root layout. Call `toast.show(...)` from anywhere. -->
<div class="host" aria-live="polite">
	{#each toasts.items as item (item.id)}
		<div
			class="toast"
			in:fly={{ y: rise, opacity: 0, duration: slow, easing: quintOut }}
			out:scale={{ start: 0.94, opacity: 0, duration: base, easing: cubicIn }}
			animate:flip={{ duration: slow, easing: quintOut }}
		>
			<Alert tone={item.tone} title={item.title}>
				{item.description ?? ''}
				{#snippet action()}
					<Button
						variant="ghost"
						size="sm"
						icon="x"
						label={closeLabel}
						onclick={() => dismiss(item.id)}
					/>
				{/snippet}
			</Alert>
		</div>
	{/each}
</div>

<style>
	.host {
		position: fixed;
		inset-block-end: var(--space-4);
		inset-inline: var(--space-4);
		z-index: var(--z-toast);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		pointer-events: none;
	}
	.toast {
		inline-size: min(100%, var(--width-dialog));
		pointer-events: auto;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-3);
	}
	/* floating over content, the alert takes the translucent material */
	.toast > :global(.alert) {
		--surface: var(--color-bg-material);
		backdrop-filter: blur(var(--blur-material)) saturate(1.8);
		animation: none;
	}
</style>
