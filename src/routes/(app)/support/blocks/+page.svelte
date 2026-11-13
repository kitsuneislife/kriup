<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { blockTargetText } from '#lib/support-text';
	import {
		Alert,
		Badge,
		Button,
		Card,
		Cluster,
		DateTime,
		EmptyState,
		Page,
		Select,
		Stack,
		Text,
		TextField
	} from '#lib/ui';

	let { data, form } = $props();

	const block = new Submission({ reset: true });
	const lift = new Submission();
	// one Submission serves every card; this says which button shows the loading state
	let lifting = $state('');

	const base = resolve('/(app)/support/blocks');
	// the actions keep `?email=`, so the person stays on screen after an answer
	const actionOf = (name: string) =>
		data.email ? `?email=${encodeURIComponent(data.email)}&/${name}` : `?/${name}`;

	const choices = $derived(
		data.person
			? [
					{ value: 'balance', label: 'Saldo: impede os saques' },
					...data.person.products.map((p) => ({
						value: `product:${p.id}`,
						label: `Produto: ${p.name}`
					}))
				]
			: []
	);

	const blockForm = $derived(form?.for === 'block' ? form : undefined);
	const blockFailure = $derived(blockForm && 'code' in blockForm ? blockForm : undefined);
	const fieldError = (key: string) => blockFailure?.fields?.[key];
	const choiceError = $derived(fieldError('target') ?? fieldError('productId'));
	// a refusal on a field shows there; anything else (a product that is not theirs) above the button
	const blockAlert = $derived.by(() => {
		const code = blockFailure?.code;
		if (!code) return undefined;
		const shown = ['target', 'productId', 'reason', 'nextStep'];
		const onFields = Object.keys(blockFailure.fields ?? {}).some((k) => shown.includes(k));
		return onFields ? undefined : errorText(code);
	});
	const liftError = (id: string) => {
		const code = form?.for === `lift:${id}` && 'code' in form ? form.code : undefined;
		return code ? errorText(code) : undefined;
	};
	const lifted = $derived(form?.for.startsWith('lift:') && !('code' in form && form.code));
</script>

<svelte:head><title>Bloqueios</title></svelte:head>

<Page>
	<Stack gap={8}>
		<Stack gap={3}>
			<Text variant="title1" as="h1">Bloqueios</Text>
			<Text tone="secondary">
				Bloqueie o saldo ou um produto de alguém enquanto um caso é analisado. A pessoa vê o motivo
				e como resolver no painel dela. Toda ação fica na auditoria.
			</Text>
			<div>
				<Button href={resolve('/(app)/support/audit')} iconEnd="arrow-right">Ver auditoria</Button>
			</div>
		</Stack>

		{#if blockForm && !blockFailure}
			<Alert tone="success" title="Bloqueio criado">
				A pessoa já vê o motivo e como resolver. O bloqueio aparece na lista abaixo.
			</Alert>
		{:else if lifted}
			<Alert tone="success" title="Bloqueio retirado">
				A pessoa volta a usar o que estava bloqueado. A ação ficou na auditoria.
			</Alert>
		{/if}

		<Stack gap={4} as="section">
			<Text variant="title3" as="h2">Bloquear</Text>
			<Card padding="lg">
				<form method="get" action={base} aria-label="Buscar pessoa">
					<Cluster gap={3} align="end">
						<TextField
							name="email"
							type="email"
							label="E-mail da pessoa"
							hint="O e-mail da conta, como aparece no pedido ou no chamado."
							value={data.email}
							error={data.emailError}
							required
						/>
						<Button type="submit" icon="search">Buscar</Button>
					</Cluster>
				</form>
			</Card>

			{#if data.email && !data.emailError && !data.person}
				<Alert tone="warning" title="Nenhuma conta com este e-mail">
					Confira o e-mail de {data.email} e busque de novo.
				</Alert>
			{/if}

			{#if data.person}
				<Card variant="frame" padding="lg">
					<form method="post" action={actionOf('block')} use:block.enhance>
						<Stack gap={4}>
							<Stack gap={1}>
								<Text weight="semibold" as="h3">{data.person.name}</Text>
								<Text variant="footnote" tone="secondary">{data.person.email}</Text>
							</Stack>
							<Select
								name="choice"
								label="O que bloquear"
								hint="Bloquear um produto suspende as vendas dele."
								options={choices}
								value={blockForm?.typed?.choice ?? 'balance'}
								error={choiceError}
								required
							/>
							<TextField
								name="reason"
								label="Motivo"
								hint="A pessoa lê este texto no painel dela."
								rows={3}
								required
								value={blockForm?.typed?.reason ?? ''}
								error={fieldError('reason')}
							/>
							<TextField
								name="nextStep"
								label="Como resolver"
								hint="O que a pessoa precisa fazer para o bloqueio sair."
								rows={2}
								required
								value={blockForm?.typed?.nextStep ?? ''}
								error={fieldError('nextStep')}
							/>
							{#if blockAlert}<Alert tone="danger">{blockAlert}</Alert>{/if}
							<div>
								<Button
									type="submit"
									variant="danger"
									icon="lock"
									name="userId"
									value={data.person.id}
									loading={block.loading('Bloqueando')}
								>
									Bloquear
								</Button>
							</div>
						</Stack>
					</form>
				</Card>
			{/if}
		</Stack>

		<Stack gap={4} as="section">
			<Stack gap={1}>
				<Text variant="title3" as="h2">Bloqueios ativos</Text>
				<Text variant="footnote" tone="secondary">O mais recente primeiro.</Text>
			</Stack>
			{#if data.blocks.length === 0}
				<EmptyState icon="shield" title="Nenhum bloqueio ativo">
					Quando você bloquear o saldo ou um produto de alguém, o bloqueio aparece aqui para ser
					retirado depois.
				</EmptyState>
			{:else}
				<Stack gap={3} as="ul">
					{#each data.blocks as b (b.id)}
						{@const what =
							b.target === 'product'
								? `${blockTargetText.product} ${b.productName ?? ''}`.trim()
								: blockTargetText[b.target]}
						<Card as="li" padding="lg">
							<Stack gap={3}>
								<Cluster justify="between" gap={3}>
									<Stack gap={1}>
										<Text weight="semibold" as="h3">{b.userName}</Text>
										<Text variant="footnote" tone="secondary">{b.userEmail}</Text>
									</Stack>
									<Badge tone="warning">{what}</Badge>
								</Cluster>
								<Stack gap={1}>
									<Text variant="subhead">Motivo: {b.reason}</Text>
									<Text variant="subhead">Para resolver: {b.nextStep}</Text>
									<Text variant="footnote" tone="secondary">
										Por {b.createdByName} em <DateTime value={b.createdAt} />
										{#if b.endsAt}· termina em <DateTime value={b.endsAt} format="date" />{/if}
									</Text>
								</Stack>
								{#if liftError(b.id)}<Alert tone="danger">{liftError(b.id)}</Alert>{/if}
								<form method="post" action={actionOf('lift')} use:lift.enhance>
									<Button
										type="submit"
										size="sm"
										icon="check"
										name="blockId"
										value={b.id}
										onclick={() => (lifting = b.id)}
										loading={lift.pending && lifting === b.id ? 'Desbloqueando' : undefined}
										label="Desbloquear: {what} de {b.userName}"
									>
										Desbloquear
									</Button>
								</form>
							</Stack>
						</Card>
					{/each}
				</Stack>
			{/if}
		</Stack>
	</Stack>
</Page>
