<script lang="ts">
	import Alert from '../Alert/Alert.svelte';
	import Button from '../Button/Button.svelte';
	import { dismiss, toasts } from './store.svelte';

	type Props = {
		/** Name of the close button, for screen readers. */
		closeLabel: string;
	};

	let { closeLabel }: Props = $props();
</script>

<!-- Mount once, in the root layout. Call `toast.show(...)` from anywhere. -->
<div class="host" aria-live="polite">
	{#each toasts.items as item (item.id)}
		<div class="toast">
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
</style>
