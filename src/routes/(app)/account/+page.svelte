<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		Alert,
		Avatar,
		Button,
		Card,
		Cluster,
		Dialog,
		Divider,
		Page,
		SegmentedControl,
		Stack,
		Text,
		TextField
	} from '#lib/ui';

	let { data, form } = $props();

	let scripted = $state(false);
	onMount(() => (scripted = true));

	const narrow = new MediaQuery('max-width: 40rem');

	const nameForm = new Submission();
	const themeForm = new Submission();
	const closeForm = new Submission();
	const signOut = new Submission();

	let closeOpen = $state(false);

	const nameFailure = $derived(
		form && 'action' in form && form.action === 'updateName' ? form : undefined
	);
	const themeFailure = $derived(
		form && 'action' in form && form.action === 'theme' ? form : undefined
	);
	const closeFailure = $derived(
		form && 'action' in form && form.action === 'closeAccount' ? form : undefined
	);
	const anyPending = $derived(nameForm.pending || themeForm.pending || closeForm.pending);
	const savedKind = $derived(!anyPending && form && 'saved' in form ? form.saved : undefined);

	let name = $derived(nameFailure ? nameFailure.name : data.user.name);
	let selectedTheme = $derived(data.theme);

	const nameFieldError = $derived(nameFailure?.fields?.name);
	const nameAlert = $derived(
		nameFailure?.code && !nameFieldError ? errorText(nameFailure.code) : undefined
	);
	const themeAlert = $derived(themeFailure?.code ? errorText(themeFailure.code) : undefined);
	const closeFieldError = $derived(closeFailure?.fields?.password);
	const closeAlert = $derived(
		closeFailure?.code && !closeFieldError ? errorText(closeFailure.code) : undefined
	);

	const showCloseCard = $derived(data.closing || closeFailure !== undefined);
	const here = resolve('/(app)/account');

	const themeOptions = [
		{ value: 'system', label: 'Sistema', icon: 'monitor' as const },
		{ value: 'light', label: 'Claro', icon: 'sun' as const },
		{ value: 'dark', label: 'Escuro', icon: 'moon' as const }
	];

	$effect(() => {
		const root = document.documentElement;
		if (selectedTheme === 'light' || selectedTheme === 'dark') {
			root.dataset.theme = selectedTheme;
		} else {
			delete root.dataset.theme;
		}
		return () => {
			if (data.theme === 'light' || data.theme === 'dark') {
				root.dataset.theme = data.theme;
			} else {
				delete root.dataset.theme;
			}
		};
	});
</script>

<svelte:head><title>Conta</title></svelte:head>

{#snippet closeConfirmationForm(cancel?: () => void, cancelHref?: string)}
	<form method="post" action="?/closeAccount" use:closeForm.enhance>
		<Stack gap={4}>
			<Text tone="secondary">
				Ao confirmar, produtos publicados voltam para rascunho, convites pendentes são cancelados e
				suas sessões são encerradas. Contas sem histórico são removidas; contas com pedidos,
				lançamentos ou registros de suporte têm os dados pessoais anonimizados.
			</Text>
			<TextField
				name="password"
				type="password"
				label="Confirme sua senha"
				autocomplete="current-password"
				error={closeFieldError}
				required
			/>
			{#if closeAlert}<Alert tone="danger">{closeAlert}</Alert>{/if}
			<Cluster gap={3} justify="end">
				{#if cancelHref}
					<Button href={cancelHref}>Cancelar</Button>
				{:else if cancel}
					<Button onclick={cancel}>Cancelar</Button>
				{/if}
				<Button variant="danger" type="submit" loading={closeForm.loading('Encerrando')}>
					Encerrar minha conta
				</Button>
			</Cluster>
		</Stack>
	</form>
{/snippet}

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

				<form method="post" action="?/updateName" use:nameForm.enhance>
					<Stack gap={4}>
						<TextField
							name="name"
							label="Seu nome"
							autocomplete="name"
							bind:value={name}
							error={nameFieldError}
							required
						/>
						{#if nameAlert}<Alert tone="danger">{nameAlert}</Alert>{/if}
						{#if savedKind === 'name'}<Alert tone="success">Nome salvo.</Alert>{/if}
						<Cluster>
							<Button type="submit" variant="primary" loading={nameForm.loading('Salvando')}>
								Salvar nome
							</Button>
						</Cluster>
					</Stack>
				</form>

				<Divider />

				<Text variant="subhead" tone="secondary">
					Para trocar a senha, <a href={resolve('/(public)/password/forgot')}>peça um link</a> no seu
					e-mail.
				</Text>
			</Stack>
		</Card>

		<Card padding="md">
			<Stack gap={4}>
				<Stack gap={1}>
					<Text variant="title3" as="h2">Aparência</Text>
					<Text variant="subhead" tone="secondary">
						Escolha como as telas aparecem neste navegador.
					</Text>
				</Stack>

				<form method="post" action="?/theme" use:themeForm.enhance>
					<Stack gap={4} align="start">
						<SegmentedControl
							name="theme"
							label="Tema"
							iconOnly={narrow.current}
							bind:value={selectedTheme}
							options={themeOptions}
						/>
						{#if themeAlert}<Alert tone="danger">{themeAlert}</Alert>{/if}
						{#if savedKind === 'theme'}<Alert tone="success">Tema salvo.</Alert>{/if}
						<Button type="submit" loading={themeForm.loading('Salvando')}>Salvar tema</Button>
					</Stack>
				</form>
			</Stack>
		</Card>

		<Card padding="lg">
			<Stack gap={4}>
				<Stack gap={1}>
					<Text variant="title3" as="h2">Privacidade e encerramento</Text>
					<Text variant="subhead" tone="secondary">
						Você pode encerrar sua conta a qualquer momento (LGPD). Saldos, saques, reembolsos ou
						bloqueios em aberto precisam ser resolvidos antes.
					</Text>
				</Stack>

				{#if scripted}
					<Cluster>
						<Button variant="ghost" onclick={() => (closeOpen = true)}>Encerrar conta</Button>
					</Cluster>
					{#if closeAlert && !closeOpen}<Alert tone="danger">{closeAlert}</Alert>{/if}
				{:else if showCloseCard}
					<Card variant="frame" padding="md">
						<Stack gap={4}>
							<Text variant="title3" as="h3">Confirmar encerramento</Text>
							{@render closeConfirmationForm(undefined, here)}
						</Stack>
					</Card>
				{:else}
					<Cluster>
						<Button variant="ghost" href="{here}?close=1">Encerrar conta</Button>
					</Cluster>
				{/if}
			</Stack>
		</Card>

		<form method="post" action="?/logout" use:signOut.enhance>
			<Button type="submit" icon="logout" loading={signOut.loading('Saindo')}>Sair</Button>
		</form>
	</Stack>
</Page>

{#if scripted}
	<Dialog bind:open={closeOpen} title="Encerrar conta" closeLabel="Fechar">
		{@render closeConfirmationForm(() => (closeOpen = false))}
	</Dialog>
{/if}
