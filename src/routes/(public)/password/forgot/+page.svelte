<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { Alert, Button, Card, Page, Stack, Text, TextField } from '#lib/ui';

	let { form } = $props();
	const send = new Submission();
</script>

<svelte:head><title>Recuperar senha</title></svelte:head>

<main>
	<Page width="text">
		<Stack gap={6}>
			<Stack gap={2}>
				<Text variant="title1" as="h1">Recuperar senha</Text>
				<Text tone="secondary">
					Informe o e-mail da sua conta. Enviamos um link para você definir uma nova senha.
				</Text>
			</Stack>
			<Card padding="lg">
				{#if form?.sent}
					<Alert tone="success" title="Confira seu e-mail">
						Se existir uma conta com {form.email}, o link chega em alguns minutos. Ele vale por 1
						hora e só pode ser usado uma vez.
					</Alert>
				{:else}
					<form method="post" use:send.enhance>
						<Stack gap={4}>
							<TextField
								name="email"
								type="email"
								label="E-mail"
								autocomplete="email"
								value={form?.email ?? ''}
								error={form?.fields?.email}
								required
							/>
							{#if form?.code}
								<Alert tone="danger">{errorText(form.code)}</Alert>
							{/if}
							<Button type="submit" variant="primary" fullWidth loading={send.loading('Enviando')}>
								Enviar link
							</Button>
						</Stack>
					</form>
				{/if}
			</Card>
			<Text variant="subhead" tone="secondary">
				Lembrou a senha? <a href={resolve('/(public)/login')}>Entrar</a>
			</Text>
		</Stack>
	</Page>
</main>
