<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { Alert, Button, Card, Page, Stack, Text, TextField } from '#lib/ui';

	let { form } = $props();
	const signUp = new Submission();
</script>

<svelte:head><title>Criar conta</title></svelte:head>

<main>
	<Page width="text">
		<Stack gap={6}>
			<Stack gap={2}>
				<Text variant="title1" as="h1">Criar conta</Text>
				<Text tone="secondary">Com uma conta você vende, compra e coproduz.</Text>
			</Stack>
			<Card padding="lg">
				<form method="post" use:signUp.enhance>
					<Stack gap={4}>
						<TextField
							name="name"
							label="Nome"
							autocomplete="name"
							value={form?.name ?? ''}
							error={form?.fields?.name}
							required
						/>
						<TextField
							name="email"
							type="email"
							label="E-mail"
							autocomplete="email"
							value={form?.email ?? ''}
							error={form?.fields?.email}
							required
						/>
						<TextField
							name="password"
							type="password"
							label="Senha"
							hint="Pelo menos 8 caracteres."
							autocomplete="new-password"
							error={form?.fields?.password}
							required
						/>
						{#if form?.code}
							<Alert tone="danger">{errorText(form.code)}</Alert>
						{/if}
						<Button
							type="submit"
							variant="primary"
							fullWidth
							loading={signUp.loading('Criando conta')}
						>
							Criar conta
						</Button>
					</Stack>
				</form>
			</Card>
			<Text variant="subhead" tone="secondary">
				Já tem conta? <a href={resolve('/(public)/login')}>Entrar</a>
			</Text>
		</Stack>
	</Page>
</main>
