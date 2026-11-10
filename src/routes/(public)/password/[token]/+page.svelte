<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { Alert, Button, Card, Page, Stack, Text, TextField } from '#lib/ui';

	let { data, form } = $props();
	const save = new Submission();

	// the link can expire while the page is open: the action answers invalid_token then
	const expired = $derived(data.owner === null || form?.code === 'invalid_token');
	const title = $derived(
		expired ? 'Link expirado' : data.owner?.hasPassword ? 'Nova senha' : 'Crie sua senha'
	);
</script>

<svelte:head><title>{title}</title></svelte:head>

<main>
	<Page width="text">
		<Stack gap={6}>
			{#if expired || !data.owner}
				<Stack gap={2}>
					<Text variant="title1" as="h1">{title}</Text>
					<Text tone="secondary">{errorText('invalid_token')}</Text>
				</Stack>
				<Button href={resolve('/(public)/password/forgot')} variant="primary">
					Pedir um novo link
				</Button>
			{:else}
				<Stack gap={2}>
					<Text variant="title1" as="h1">{title}</Text>
					<Text tone="secondary">
						Olá, {data.owner.name}. Defina a senha da conta {data.owner.email}. Depois disso você já
						entra.
					</Text>
				</Stack>
				<Card padding="lg">
					<form method="post" use:save.enhance>
						<Stack gap={4}>
							<TextField
								name="password"
								type="password"
								label={data.owner.hasPassword ? 'Nova senha' : 'Senha'}
								hint="Pelo menos 8 caracteres."
								autocomplete="new-password"
								error={form?.fields?.password}
								required
							/>
							{#if form?.code}
								<Alert tone="danger">{errorText(form.code)}</Alert>
							{/if}
							<Button type="submit" variant="primary" fullWidth loading={save.loading('Salvando')}>
								Salvar e entrar
							</Button>
						</Stack>
					</form>
				</Card>
			{/if}
		</Stack>
	</Page>
</main>
