<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		GUARANTEE_DAYS,
		OFFER_MIN_PRICE_CENTS,
		PLATFORM_FEE_BP,
		PLATFORM_FIXED_FEE_CENTS
	} from '#lib/domain/params';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		Alert,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		Disclosure,
		Divider,
		EmptyState,
		formatDecimal,
		formatMoney,
		Money,
		Page,
		Stack,
		Stat,
		Text,
		TextField
	} from '#lib/ui';
	import ConfirmDelete from '../ConfirmDelete.svelte';

	let { data, form, params } = $props();

	// one Submission for the edit forms and one for the add form (that one empties itself);
	// `active` says which form is on its way, so only its button shows the loading state
	const edit = new Submission();
	const add = new Submission({ reset: true });
	let active = $state('');
	const loading = (key: string, text: string) =>
		active === key ? (edit.loading(text) ?? add.loading(text)) : undefined;

	/** The answer for one form: its error, the fields typed and whether it saved. */
	const answerFor = (key: string) => (form?.for === key ? form : undefined);
	const errorsOf = (key: string): Record<string, string> => {
		const answer = answerFor(key);
		return (answer && 'fields' in answer && answer.fields) || {};
	};
	const typedOf = (key: string): Record<string, string> | undefined => {
		const answer = answerFor(key);
		return (answer && 'typed' in answer && answer.typed) || undefined;
	};
	// a delete has no form of its own to show a refusal on: it goes on top
	const pageError = $derived(
		form && 'code' in form && form.for.startsWith('delete:') ? form.code : undefined
	);

	const action = (name: string, id: string) => `?/${name}&id=${id}`;
	const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
	const fee = `${PLATFORM_FEE_BP / 100}% + ${formatMoney(PLATFORM_FIXED_FEE_CENTS)}`;
	const priceHint = `A partir de ${formatMoney(OFFER_MIN_PRICE_CENTS)}. Por exemplo: 97,90.`;
	const guaranteeHint = `De ${GUARANTEE_DAYS} a 365 dias. Nesse prazo o comprador pode pedir o reembolso.`;

	// an offer opens to be edited; a refusal opens it
	const opened: Record<string, boolean> = $state({});
	const isOpen = (id: string) => opened[id] ?? form?.for === `offer:${id}`;
</script>

<svelte:head><title>Ofertas · {data.product.name}</title></svelte:head>

{#snippet saved(key: string, text: string)}
	{@const answer = answerFor(key)}
	{#if answer && 'saved' in answer}
		<Alert tone="success">{text}</Alert>
	{:else if answer && 'code' in answer}
		<Alert tone="danger">{errorText(answer.code)}</Alert>
	{/if}
{/snippet}

{#snippet fields(key: string, offer?: (typeof data.offers)[number])}
	{@const typed = typedOf(key)}
	{@const errors = errorsOf(key)}
	<TextField
		name="name"
		label="Nome da oferta"
		hint="O comprador vê no checkout. Por exemplo: À vista."
		value={typed?.name ?? offer?.name ?? ''}
		error={errors.name}
	/>
	<TextField
		name="price"
		label="Preço em reais"
		hint={priceHint}
		value={typed?.price ?? (offer ? formatDecimal(offer.priceCents) : '')}
		error={errors.price}
	/>
	<TextField
		name="guaranteeDays"
		type="number"
		label="Garantia em dias"
		hint={guaranteeHint}
		value={typed?.guaranteeDays ?? String(offer?.guaranteeDays ?? GUARANTEE_DAYS)}
		error={errors.guaranteeDays}
	/>
{/snippet}

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
					{ label: 'Ofertas' }
				]}
			/>
			<Text variant="title1" as="h1">Ofertas</Text>
			<Text tone="secondary">
				Cada oferta é um jeito de comprar o produto, com preço e garantia próprios. Em cada venda a
				plataforma fica com {fee}. Mudar uma oferta não muda as vendas já feitas.
			</Text>
		</Stack>

		{#if pageError}<Alert tone="danger">{errorText(pageError)}</Alert>{/if}

		{#if data.offers.length === 0}
			<EmptyState icon="receipt" title="Nenhuma oferta ainda">
				Sem oferta o produto não pode ser vendido. Crie a primeira abaixo.
			</EmptyState>
		{/if}

		{#each data.offers as offer (offer.id)}
			{@const key = `offer:${offer.id}`}
			<Card variant="frame" as="section">
				{#snippet header()}
					<Stack gap={1}>
						<Text variant="title3" as="h2">{offer.name}</Text>
						<Text variant="footnote" tone="secondary">
							Garantia de {days(offer.guaranteeDays)}
						</Text>
					</Stack>
				{/snippet}
				<Stack gap={6}>
					<!-- three short numbers: side by side when they fit, stacked on a phone -->
					<Cluster gap={8} align="start">
						<Stat label="Preço"><Money cents={offer.priceCents} weight="semibold" /></Stat>
						<Stat label="Taxa da plataforma">
							<Money cents={offer.feeCents} tone="secondary" />
						</Stat>
						<Stat label="Líquido por venda" tone="success">
							<Money cents={offer.priceCents - offer.feeCents} weight="semibold" />
						</Stat>
					</Cluster>
					<Disclosure
						title="Editar oferta"
						icon="edit"
						bind:open={() => isOpen(offer.id), (open) => (opened[offer.id] = open)}
					>
						<Stack gap={4}>
							<form
								method="post"
								action={action('updateOffer', offer.id)}
								use:edit.enhance
								onsubmit={() => (active = key)}
							>
								<Stack gap={4}>
									{@render fields(key, offer)}
									{@render saved(key, 'Oferta salva.')}
									<Cluster>
										<Button type="submit" loading={loading(key, 'Salvando')}>Salvar oferta</Button>
									</Cluster>
								</Stack>
							</form>
							<Divider />
							<Cluster justify="end">
								<ConfirmDelete
									action={action('deleteOffer', offer.id)}
									label="Apagar oferta"
									title="Apagar a oferta {offer.name}?"
								>
									Só uma oferta sem vendas pode ser apagada. Não dá para desfazer.
								</ConfirmDelete>
							</Cluster>
						</Stack>
					</Disclosure>
				</Stack>
			</Card>
		{/each}

		<form
			method="post"
			action="?/addOffer"
			aria-label="Nova oferta"
			use:add.enhance
			onsubmit={() => (active = 'new-offer')}
		>
			<Stack gap={4}>
				<Text variant="title3" as="h2">Nova oferta</Text>
				{@render fields('new-offer')}
				{@render saved('new-offer', 'Oferta adicionada.')}
				<Cluster>
					<Button
						type="submit"
						variant="primary"
						icon="plus"
						loading={loading('new-offer', 'Adicionando')}
					>
						Adicionar oferta
					</Button>
				</Cluster>
			</Stack>
		</form>
	</Stack>
</Page>
