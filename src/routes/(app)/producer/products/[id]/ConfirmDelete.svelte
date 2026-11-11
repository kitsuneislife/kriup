<script lang="ts">
	// Delete with a confirmation Dialog. Without JavaScript the button submits straight away,
	// so the form still works; with it, the Dialog asks first.
	import type { Snippet } from 'svelte';
	import { Submission } from '#lib/forms.svelte';
	import { Button, Dialog, Text } from '#lib/ui';

	type Props = {
		/** The form action, with the id of what is deleted. */
		action: string;
		/** Text of both buttons, for example "Apagar aula". */
		label: string;
		/** The question in the Dialog, for example "Apagar a aula Boas-vindas?". */
		title: string;
		/** What else goes with it, in one sentence. */
		children: Snippet;
	};

	let { action, label, title, children }: Props = $props();
	let open = $state(false);
	const remove = new Submission({ done: () => (open = false) });
</script>

<form method="post" {action}>
	<Button
		type="submit"
		size="sm"
		variant="ghost"
		icon="trash"
		onclick={(event) => {
			event.preventDefault();
			open = true;
		}}
	>
		{label}
	</Button>
</form>

<Dialog bind:open {title} closeLabel="Fechar">
	<Text tone="secondary">{@render children()}</Text>
	{#snippet footer()}
		<Button onclick={() => (open = false)}>Cancelar</Button>
		<form method="post" {action} use:remove.enhance>
			<Button type="submit" variant="danger" loading={remove.loading('Apagando')}>{label}</Button>
		</form>
	{/snippet}
</Dialog>
