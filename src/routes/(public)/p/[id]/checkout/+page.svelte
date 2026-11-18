<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		Alert,
		Badge,
		BrandScope,
		Button,
		Card,
		Cluster,
		Disclosure,
		Divider,
		Icon,
		Money,
		Page,
		SegmentedControl,
		Stack,
		Text,
		TextField
	} from '#lib/ui';

	let { data, form, params } = $props();
	const pay = new Submission();

	function formatTaxId(raw: string): string {
		if (!/^[\d.\-/\s]*$/.test(raw)) return raw;
		const d = raw.replace(/\D/g, '');
		if (d.length === 0 || d.length > 14) return raw;
		if (d.length <= 3) return d;
		if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
		if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
		if (d.length <= 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
		if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
		return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
	}

	const isMonthly = (o: { recurrence?: string }) => o.recurrence === 'monthly';
	const typed = $derived(form?.typed);
	const errors = $derived(form?.fields ?? {});
	let taxId = $derived(typed?.taxId ?? '');
	// what was chosen survives a refusal; Pix is the default (no card fee, instant access)
	let method = $derived(typed?.method === 'card' ? 'card' : 'pix');
	const monthly = $derived(isMonthly(data.offer));
	const summary = $derived(data.sections.find((section) => section.kind === 'summary')?.fields);
	const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
</script>

<svelte:head>
	<title>Finalizar compra · {data.product.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<BrandScope color={data.product.brand.color} font={data.product.brand.font}>
	<main>
		<Page width="text">
			<Stack gap={6}>
				<Cluster justify="between" gap={3}>
					<a class="home" href={resolve('/(public)/p/[id]', { id: params.id })}>
						{#if data.product.brand.logoUrl}
							<img class="logo" src={data.product.brand.logoUrl} alt={data.product.name} />
						{:else}
							<Text weight="semibold">{data.product.name}</Text>
						{/if}
					</a>
					<Cluster gap={1}>
						<Text tone="secondary"><Icon name="lock" size="sm" /></Text>
						<Text variant="footnote" tone="secondary">Compra segura</Text>
					</Cluster>
				</Cluster>

				<Text variant="title1" as="h1">Finalizar compra</Text>

				<Card padding="lg" as="section">
					<Stack gap={3}>
						{#if monthly}
							<Cluster>
								<Badge tone="indigo" size="sm">Assinatura mensal</Badge>
							</Cluster>
						{/if}
						<Text variant="subhead" tone="secondary">
							{summary?.title || `Você está comprando ${data.product.name}`}
						</Text>
						<Cluster justify="between" align="baseline" gap={3}>
							<Text variant="title3" as="h2">{data.offer.name}</Text>
							<Cluster gap={1} align="baseline" wrap={false}>
								<Money cents={data.offer.priceCents} variant="title2" weight="bold" />
								{#if monthly}
									<Text as="span" variant="subhead" tone="secondary">/mês</Text>
								{/if}
							</Cluster>
						</Cluster>
						<Divider />
						<Cluster gap={2} wrap={false} align="start">
							<span class="accent"><Icon name="shield" size="sm" /></span>
							<Text variant="footnote" tone="secondary">
								Garantia de {days(data.offer.guaranteeDays)}. {summary?.note ?? ''}
							</Text>
						</Cluster>
					</Stack>
				</Card>

				<form method="post" use:pay.enhance>
					<Stack gap={6}>
						<Stack gap={4}>
							<Text variant="title3" as="h2">Seus dados</Text>
							{#if data.buyer}
								<Alert>
									Comprando como {data.buyer.name} ({data.buyer.email}). O acesso fica nesta conta.
								</Alert>
							{:else}
								<TextField
									name="name"
									label="Nome completo"
									autocomplete="name"
									value={typed?.name ?? ''}
									error={errors.name}
									required
								/>
								<TextField
									name="email"
									type="email"
									label="E-mail"
									hint="O acesso ao produto chega neste e-mail."
									autocomplete="email"
									inputmode="email"
									value={typed?.email ?? ''}
									error={errors.email}
									required
								/>
							{/if}
							<TextField
								name="taxId"
								label="CPF ou CNPJ"
								hint="Pedido pelo meio de pagamento. Não guardamos esse número."
								autocomplete="off"
								inputmode="numeric"
								bind:value={() => taxId, (v) => (taxId = formatTaxId(v))}
								error={errors.taxId}
								required
							/>
						</Stack>

						<Stack gap={3}>
							<Text variant="title3" as="h2">Forma de pagamento</Text>
							<SegmentedControl
								name="method"
								label="Forma de pagamento"
								bind:value={method}
								options={[
									{ value: 'pix', label: 'Pix', icon: 'sparkles' },
									{ value: 'card', label: 'Cartão', icon: 'card' }
								]}
							/>
							<Text variant="footnote" tone="secondary">
								{method === 'card'
									? 'Você digita o cartão na página segura do meio de pagamento, não aqui.'
									: 'O código Pix aparece na próxima tela. O acesso é liberado assim que o pagamento cai.'}
							</Text>
						</Stack>

						{#if form?.code}<Alert tone="danger">{errorText(form.code)}</Alert>{/if}

						<Stack gap={3}>
							<Button
								type="submit"
								variant="primary"
								size="lg"
								fullWidth
								icon="lock"
								loading={pay.loading('Preparando pagamento')}
							>
								{method === 'card' ? 'Continuar para o cartão' : 'Gerar Pix'}
							</Button>
							<Text variant="footnote" tone="secondary">
								Ao comprar, você concorda com a política de reembolso de {data.product.name}.
							</Text>
						</Stack>
					</Stack>
				</form>

				<Disclosure title="Ler política de reembolso" icon="shield">
					<Text tone="secondary">{data.product.refundPolicy}</Text>
				</Disclosure>

				<Text variant="subhead">
					<a href={resolve('/(public)/p/[id]', { id: params.id })}
						>Voltar para a página do produto</a
					>
				</Text>
			</Stack>
		</Page>
	</main>
</BrandScope>

<style>
	.home {
		display: inline-flex;
		color: inherit;
		text-decoration: none;
	}
	.logo {
		max-block-size: var(--space-8);
		max-inline-size: 10rem;
		object-fit: contain;
	}
	.accent {
		display: inline-flex;
		color: var(--color-accent);
	}
</style>
