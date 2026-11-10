<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button, Page, Stack, Text } from '#lib/ui';

	// A foreign resource answers 404 like a missing one (RNF-05), so the text never says which.
	const text = $derived(
		page.status === 404
			? {
					title: 'Página não encontrada',
					body: 'O endereço pode estar errado, ou esta página não está disponível para a sua conta.'
				}
			: {
					title: 'Algo deu errado do nosso lado',
					body: 'Tente de novo em alguns instantes. Se continuar, fale com o suporte.'
				}
	);
</script>

<svelte:head><title>{text.title}</title></svelte:head>

<main>
	<Page width="text">
		<Stack gap={6} align="start">
			<Stack gap={2}>
				<Text variant="footnote" tone="secondary" numeric>Erro {page.status}</Text>
				<Text variant="title1" as="h1">{text.title}</Text>
				<Text tone="secondary">{text.body}</Text>
			</Stack>
			<Button href={resolve('/')} variant="primary">Ir para o início</Button>
		</Stack>
	</Page>
</main>
