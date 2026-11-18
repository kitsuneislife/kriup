<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		COPRODUCTION_MAX_BP,
		PLATFORM_FEE_BP,
		PLATFORM_FIXED_FEE_CENTS
	} from '#lib/domain/params';
	import { parsePercent, simulateSale } from '#lib/domain/simulation';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		Alert,
		Badge,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		DateTime,
		EmptyState,
		formatMoney,
		Money,
		Page,
		Select,
		Stack,
		Stat,
		Table,
		Text,
		TextField,
		type Tone
	} from '#lib/ui';
	import ConfirmDelete from '../ConfirmDelete.svelte';

	let { data, form, params } = $props();

	const invite = new Submission({ reset: true });
	const sim = $derived(data.simulation);
	let livePercent = $derived(sim.percentText);
	let liveOfferId = $derived(sim.offerId);
	const liveOffer = $derived(data.offers.find((o) => o.id === liveOfferId) ?? data.offers[0]);
	const liveBp = $derived(livePercent ? parsePercent(livePercent) : undefined);
	const liveInvalid = $derived(livePercent !== '' && liveBp === undefined);
	const liveSale = $derived(
		liveOffer && liveBp !== undefined ? simulateSale(liveOffer.priceCents, liveBp) : null
	);

	const statusText: Record<(typeof data.terms)[number]['status'], { label: string; tone: Tone }> = {
		invited: { label: 'Aguardando aceite', tone: 'warning' },
		active: { label: 'Em vigor', tone: 'success' },
		ended: { label: 'Encerrada', tone: 'neutral' },
		canceled: { label: 'Cancelada', tone: 'neutral' }
	};
	const percent = (bp: number) => `${(bp / 100).toLocaleString('pt-BR')}%`;
	const limit = percent(COPRODUCTION_MAX_BP);
	const fee = `${PLATFORM_FEE_BP / 100}% + ${formatMoney(PLATFORM_FIXED_FEE_CENTS)}`;

	/** The answer for one form; the invite's refusal also carries what was typed. */
	const inviteAnswer = $derived(form?.for === 'invite' ? form : undefined);
	const typed = $derived(inviteAnswer && 'typed' in inviteAnswer ? inviteAnswer.typed : undefined);
	const errors: Record<string, string | undefined> = $derived(
		(inviteAnswer && 'fields' in inviteAnswer && inviteAnswer.fields) || {}
	);
	const code = $derived(inviteAnswer && 'code' in inviteAnswer ? inviteAnswer.code : undefined);
	// a domain refusal goes under the field it is about; anything else goes on top
	const emailError = $derived(
		errors.email ??
			(code === 'already_invited' || code === 'self_coproduction' ? errorText(code) : undefined)
	);
	const percentError = $derived(
		errors.percent ?? (code === 'share_limit' ? errorText(code) : undefined)
	);
	const topError = $derived(
		code &&
			code !== 'invalid_input' &&
			code !== 'already_invited' &&
			code !== 'self_coproduction' &&
			code !== 'share_limit'
			? errorText(code)
			: undefined
	);
	const cancelError = $derived(
		form && form.for.startsWith('cancel:') && 'code' in form && form.code
			? errorText(form.code)
			: undefined
	);

	const columns = [
		{ key: 'coproducerName', header: 'Coprodutor' },
		{ key: 'percentBp', header: 'Parte', align: 'end' },
		{ key: 'durationDays', header: 'Duração' },
		{ key: 'status', header: 'Situação' },
		{ key: 'createdAt', header: 'Convite' },
		{ key: 'id', header: 'Ação' }
	] as const;
</script>

<svelte:head><title>Coprodução · {data.product.name}</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Produtos', href: resolve('/(app)/producer') },
					{
						label: data.product.name,
						href: resolve('/(app)/producer/products/[id]', { id: params.id })
					},
					{ label: 'Coprodução' }
				]}
			/>
			<Text variant="title1" as="h1">Coprodução</Text>
			<Text tone="secondary">
				Convide alguém para dividir as vendas deste produto. A parte dela vem do que sobra depois da
				taxa da plataforma ({fee}), de até {limit} no total. Ela só passa a receber depois de ler o contrato
				e aceitar.
			</Text>
		</Stack>

		<Stack gap={4}>
			<Text variant="title2" as="h2">Simular uma venda</Text>
			<form method="get" aria-label="Simulação">
				<Stack gap={4}>
					<TextField
						name="percent"
						label="Parte do coprodutor, em %"
						hint="Por exemplo: 30 ou 12,5."
						bind:value={livePercent}
						error={liveInvalid ? errorText('invalid_input') : undefined}
					/>
					{#if data.offers.length > 1}
						<Select
							name="offer"
							label="Oferta"
							bind:value={liveOfferId}
							options={data.offers.map((o) => ({
								value: o.id,
								label: `${o.name} (${formatMoney(o.priceCents)})`
							}))}
						/>
					{/if}
					<Cluster><Button type="submit">Simular</Button></Cluster>
				</Stack>
			</form>
			{#if data.offers.length === 0}
				<EmptyState icon="receipt" title="Sem oferta para simular">
					Crie uma oferta para ver como uma venda se divide.
				</EmptyState>
			{:else if liveSale}
				<Card variant="frame">
					<Cluster gap={8} align="start">
						<Stat label="Valor da venda"
							><Money cents={liveSale.grossCents} weight="semibold" /></Stat
						>
						<Stat label="Taxa da plataforma">
							<Money cents={liveSale.feeCents} tone="secondary" />
						</Stat>
						<Stat label="Sua parte" tone="success">
							<Money cents={liveSale.producerCents} weight="semibold" />
						</Stat>
						<Stat label="Parte do coprodutor">
							<Money cents={liveSale.coproducerCents} weight="semibold" />
						</Stat>
					</Cluster>
				</Card>
			{:else}
				<Text tone="secondary">
					Informe a parte do coprodutor para ver quanto cada um recebe de uma venda.
				</Text>
			{/if}
		</Stack>

		<form method="post" action="?/invite" aria-label="Novo convite" use:invite.enhance>
			<Stack gap={4}>
				<Text variant="title2" as="h2">Convidar coprodutor</Text>
				{#if topError}<Alert tone="danger">{topError}</Alert>{/if}
				<TextField
					name="email"
					type="email"
					label="E-mail do coprodutor"
					hint="O convite e o contrato vão para este e-mail."
					value={typed?.email ?? ''}
					error={emailError}
				/>
				<TextField
					name="name"
					label="Nome do coprodutor"
					hint="Usado só se a pessoa ainda não tiver conta."
					value={typed?.name ?? ''}
					error={errors.name}
				/>
				<TextField
					name="percent"
					label="Percentual do coprodutor"
					hint={`De 0,01 a ${COPRODUCTION_MAX_BP / 100}, em %. Por exemplo: 30.`}
					value={typed?.percent ?? livePercent}
					error={percentError}
				/>
				<TextField
					name="durationDays"
					type="number"
					label="Duração em dias"
					hint="Conta a partir do aceite. Deixe em branco para não ter data final."
					value={typed?.durationDays ?? ''}
					error={errors.durationDays}
				/>
				{#if inviteAnswer && 'saved' in inviteAnswer}
					<Alert tone="success">Convite enviado. A pessoa recebeu o contrato por e-mail.</Alert>
				{/if}
				<Cluster>
					<Button type="submit" variant="primary" icon="send" loading={invite.loading('Enviando')}>
						Enviar convite
					</Button>
				</Cluster>
			</Stack>
		</form>

		<Stack gap={4}>
			<Text variant="title2" as="h2">Convites e versões</Text>
			<Text tone="secondary">
				Mudar o percentual é um novo convite. Quando ele for aceito, a versão anterior termina.
			</Text>
			{#if cancelError}<Alert tone="danger">{cancelError}</Alert>{/if}
			<Table
				caption="Convites e versões da coprodução"
				columns={[...columns]}
				rows={data.terms}
				rowKey={(row) => row.id}
			>
				{#snippet cell(row, column)}
					{#if column.key === 'coproducerName'}
						<Stack gap={1}>
							<Text weight="semibold">{row.coproducerName}</Text>
							<Text variant="footnote" tone="secondary">{row.coproducerEmail}</Text>
						</Stack>
					{:else if column.key === 'percentBp'}
						{percent(row.percentBp)}
					{:else if column.key === 'durationDays'}
						{row.durationDays === null ? 'Sem data final' : `${row.durationDays} dias`}
					{:else if column.key === 'status'}
						<Badge tone={statusText[row.status].tone} size="sm" dot>
							{statusText[row.status].label}
						</Badge>
					{:else if column.key === 'createdAt'}
						<DateTime value={row.createdAt} />
					{:else if row.status === 'invited'}
						<ConfirmDelete
							action="?/cancel&id={row.id}"
							label="Cancelar convite"
							title="Cancelar o convite para {row.coproducerName}?"
						>
							A pessoa não poderá mais aceitar. Você pode enviar um novo convite depois.
						</ConfirmDelete>
					{/if}
				{/snippet}
				{#snippet empty()}
					<EmptyState icon="users" title="Nenhum convite ainda">
						Quando você convidar alguém, o convite e as versões do contrato aparecem aqui.
					</EmptyState>
				{/snippet}
			</Table>
		</Stack>
	</Stack>
</Page>
