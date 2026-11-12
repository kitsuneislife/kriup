<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		BrandHero,
		BrandScope,
		Button,
		Card,
		Cluster,
		Disclosure,
		Icon,
		Money,
		Page,
		Stack,
		Text
	} from '#lib/ui';
	import Sections from './Sections.svelte';

	let { data, params } = $props();

	const hero = $derived(data.sections.find((section) => section.kind === 'hero')?.fields);
	const rest = $derived(data.sections.filter((section) => section.kind !== 'hero'));
	const checkout = (offerId: string) =>
		`${resolve('/(public)/p/[id]/checkout', { id: params.id })}?offer=${offerId}`;
	// one offer: the hero button buys it; several: it leads to the choice
	const buy = $derived(data.offers.length === 1 ? checkout(data.offers[0]!.id) : '#ofertas');
	const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
	const description = $derived(hero?.subtitle ?? data.product.name);
</script>

<svelte:head>
	<title>{data.product.name}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={data.product.name} />
	<meta property="og:description" content={description} />
</svelte:head>

<BrandScope color={data.product.brand.color} font={data.product.brand.font}>
	<main>
		<Page width="text">
			<Stack gap={12}>
				<BrandHero
					size="page"
					title={hero?.title || data.product.name}
					subtitle={hero?.subtitle ?? ''}
					cta={hero?.cta || 'Quero comprar'}
					href={buy}
					color={data.product.brand.color}
					font={data.product.brand.font}
					logoUrl={data.product.brand.logoUrl}
				/>

				<Sections sections={rest} />

				<section id="ofertas" class="offers">
					<Stack gap={4}>
						<Text variant="title2" as="h2">
							{data.offers.length === 1 ? 'Garanta seu acesso' : 'Escolha como comprar'}
						</Text>
						{#each data.offers as offer (offer.id)}
							<Card padding="lg">
								<Stack gap={4}>
									<Cluster justify="between" align="baseline" gap={4}>
										<Text variant="title3" as="h3">{offer.name}</Text>
										<Money cents={offer.priceCents} variant="title1" weight="bold" />
									</Cluster>
									<Cluster gap={2} wrap={false}>
										<Text tone="secondary"><Icon name="shield" /></Text>
										<Text variant="subhead" tone="secondary">
											Garantia de {days(offer.guaranteeDays)}: se não gostar, peça o reembolso.
										</Text>
									</Cluster>
									<Button
										variant="primary"
										size="lg"
										fullWidth
										iconEnd="arrow-right"
										href={checkout(offer.id)}
									>
										Comprar agora
									</Button>
								</Stack>
							</Card>
						{/each}
					</Stack>
				</section>

				<Stack gap={4}>
					<Disclosure title="Política de reembolso" icon="refresh">
						<Text tone="secondary">{data.product.refundPolicy}</Text>
					</Disclosure>
					<Cluster gap={2} justify="center" wrap={false}>
						<Text tone="secondary"><Icon name="lock" size="sm" /></Text>
						<Text variant="footnote" tone="secondary">
							Pagamento seguro por Pix ou cartão. O acesso chega por e-mail.
						</Text>
					</Cluster>
				</Stack>
			</Stack>
		</Page>
	</main>
</BrandScope>

<style>
	/* the hero's button jumps here; leave room above the heading */
	.offers {
		scroll-margin-block-start: var(--space-8);
	}
</style>
