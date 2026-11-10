<script lang="ts">
	import { resolve } from '$app/paths';
	import { Submission } from '#lib/forms.svelte';
	import { Avatar, Button, Card, Cluster, Page, Stack, Text } from '#lib/ui';

	let { data } = $props();
	const signOut = new Submission();
</script>

<svelte:head><title>Conta</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Text variant="title1" as="h1">Conta</Text>
		<Card padding="lg">
			<Stack gap={6}>
				<Cluster gap={4} wrap={false}>
					<Avatar name={data.user.name} size="lg" />
					<Stack gap={1}>
						<Text variant="title3" as="h2" truncate>{data.user.name}</Text>
						<Text tone="secondary" truncate>{data.user.email}</Text>
					</Stack>
				</Cluster>
				<Text variant="subhead" tone="secondary">
					Para trocar a senha, <a href={resolve('/(public)/password/forgot')}>peça um link</a> no seu
					e-mail.
				</Text>
			</Stack>
		</Card>
		<form method="post" action="?/logout" use:signOut.enhance>
			<Button type="submit" icon="logout" loading={signOut.loading('Saindo')}>Sair</Button>
		</form>
	</Stack>
</Page>
