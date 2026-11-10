<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { Toast } from '#lib/ui';

	let { children } = $props();

	// Smooth page changes with the View Transitions API; without it the page swaps directly.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{@render children()}
<Toast closeLabel="Fechar aviso" />
