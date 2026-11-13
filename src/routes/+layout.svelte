<script lang="ts">
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { Toast } from '#lib/ui';

	let { children } = $props();

	// Marks the page as interactive, so e2e specs wait before using a control that hydration
	// would reset (e2e/fixtures.ts `hydrated`).
	onMount(() => {
		document.documentElement.dataset.hydrated = '';
	});

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
