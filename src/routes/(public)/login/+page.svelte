<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { Alert, Button, Card, Logo, Page, Stack, Text, TextField } from '#lib/ui';

	let { data, form } = $props();
	const signIn = new Submission();
</script>

<svelte:head><title>Entrar</title></svelte:head>

<main>
	<Page width="text">
		<Stack gap={6}>
			<Stack gap={2}>
				<Logo />
				<Text variant="title1" as="h1">Entrar</Text>
				<Text tone="secondary">Use o e-mail e a senha da sua conta.</Text>
			</Stack>
			<Card padding="lg">
				<form
					method="post"
					action={data.next ? `?next=${encodeURIComponent(data.next)}` : undefined}
					use:signIn.enhance
				>
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
						<TextField
							name="password"
							type="password"
							label="Senha"
							autocomplete="current-password"
							error={form?.fields?.password}
							required
						/>
						{#if form?.code}
							<Alert tone="danger">{errorText(form.code)}</Alert>
						{/if}
						<Button type="submit" variant="primary" fullWidth loading={signIn.loading('Entrando')}>
							Entrar
						</Button>
						<Text variant="subhead">
							<a href={resolve('/(public)/password/forgot')}>Esqueci minha senha</a>
						</Text>
					</Stack>
				</form>
			</Card>
			<Text variant="subhead" tone="secondary">
				Ainda não tem conta? <a href={resolve('/(public)/register')}>Criar conta</a>
			</Text>
		</Stack>
	</Page>
</main>
