<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Alert,
		Badge,
		BrandHero,
		BrandScope,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		Disclosure,
		Divider,
		EmptyState,
		Icon,
		LessonList,
		Money,
		Page,
		Stack,
		Text,
		VideoFrame
	} from '#lib/ui';
	import { paragraphs, videoOf } from '../../../../student/courses/[id]/player';
	import Sections from '../../../../../(public)/p/[id]/Sections.svelte';

	let { data, params } = $props();

	const editor = $derived(resolve('/(app)/producer/products/[id]', { id: params.id }));
	const preview = $derived(resolve('/(app)/producer/products/[id]/preview', { id: params.id }));
	const lessonHref = (id: string) => `${preview}?view=course&lesson=${id}`;
	const hero = $derived(data.sections.find((section) => section.kind === 'hero')?.fields);
	const rest = $derived(data.sections.filter((section) => section.kind !== 'hero'));
	const checkoutSummary = $derived(
		data.checkoutSections.find((section) => section.kind === 'summary')?.fields
	);
	const emailFields = $derived(
		data.emailSections.find((section) => section.kind === 'email')?.fields
	);
	const emailParagraphs = $derived(paragraphs(emailFields?.body ?? ''));
	const sampleOffer = $derived(data.offers[0]);
	const video = $derived(data.current?.videoUrl ? videoOf(data.current.videoUrl) : null);
	const days = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
</script>

<svelte:head><title>Prévia de {data.product.name}</title></svelte:head>

<BrandScope color={data.product.brand.color} font={data.product.brand.font}>
	<Page width={data.view === 'course' ? 'page' : 'text'}>
		<Stack gap={8}>
			<Stack gap={4}>
				<Breadcrumb
					label="Caminho"
					items={[
						{ label: 'Produtos', href: resolve('/(app)/producer') },
						{ label: data.product.name, href: editor },
						{ label: 'Prévia' }
					]}
				/>
				<Alert tone="info" title="Prévia: assim o aluno vê">
					Só você vê esta tela, e nada aqui compra ou muda dados.
					{#if data.product.status !== 'published'}
						O produto ainda é um rascunho e só aparece para o público depois de publicado.
					{/if}
					{#snippet action()}
						<Button size="sm" variant="neutral" icon="arrow-left" href={editor}>
							Voltar ao editor
						</Button>
					{/snippet}
				</Alert>
				<nav aria-label="O que visualizar">
					<Cluster gap={2}>
						<Button
							size="sm"
							variant={data.view === 'sales' ? 'primary' : 'neutral'}
							href={preview}
						>
							Página de venda{#if data.view === 'sales'}<span class="visually-hidden">
									(aberta)</span
								>{/if}
						</Button>
						<Button
							size="sm"
							variant={data.view === 'checkout' ? 'primary' : 'neutral'}
							href="{preview}?view=checkout"
						>
							Checkout{#if data.view === 'checkout'}<span class="visually-hidden">
									(aberto)</span
								>{/if}
						</Button>
						<Button
							size="sm"
							variant={data.view === 'email' ? 'primary' : 'neutral'}
							href="{preview}?view=email"
						>
							E-mail de acesso{#if data.view === 'email'}<span class="visually-hidden">
									(aberto)</span
								>{/if}
						</Button>
						<Button
							size="sm"
							variant={data.view === 'course' ? 'primary' : 'neutral'}
							href="{preview}?view=course"
						>
							Conteúdo do curso{#if data.view === 'course'}<span class="visually-hidden">
									(aberto)</span
								>{/if}
						</Button>
					</Cluster>
				</nav>
				{#if data.view === 'course'}
					<Text variant="title1" as="h1">{data.product.name}</Text>
				{/if}
			</Stack>

			{#if data.view === 'sales'}
				<Stack gap={12}>
					<BrandHero
						size="page"
						title={hero?.title || data.product.name}
						subtitle={hero?.subtitle ?? ''}
						cta={hero?.cta || 'Quero comprar'}
						color={data.product.brand.color}
						font={data.product.brand.font}
						logoUrl={data.product.brand.logoUrl}
					/>

					<Sections sections={rest} />

					<Stack gap={4} as="section">
						<Text variant="title2" as="h2">
							{data.offers.length === 1 ? 'Garanta seu acesso' : 'Escolha como comprar'}
						</Text>
						{#each data.offers as offer (offer.id)}
							<Card padding="lg">
								<Stack gap={3}>
									<Cluster justify="between" align="baseline" gap={4}>
										<Cluster gap={2} align="center">
											<Text variant="title3" as="h3">{offer.name}</Text>
											{#if offer.recurrence === 'monthly'}
												<Badge tone="indigo" size="sm">Mensal</Badge>
											{/if}
										</Cluster>
										<Cluster gap={1} align="baseline" wrap={false}>
											<Money cents={offer.priceCents} variant="title1" weight="bold" />
											{#if offer.recurrence === 'monthly'}
												<Text variant="subhead" tone="secondary">/mês</Text>
											{/if}
										</Cluster>
									</Cluster>
									<Cluster gap={2} wrap={false}>
										<Text tone="secondary"><Icon name="shield" /></Text>
										<Text variant="subhead" tone="secondary">
											Garantia de {days(offer.guaranteeDays)}: se não gostar, peça o reembolso.
										</Text>
									</Cluster>
								</Stack>
							</Card>
						{:else}
							<EmptyState icon="receipt" title="Nenhuma oferta ainda">
								Sem oferta o aluno não consegue comprar.
								{#snippet action()}
									<Button
										variant="primary"
										href={resolve('/(app)/producer/products/[id]/offers', { id: params.id })}
									>
										Criar uma oferta
									</Button>
								{/snippet}
							</EmptyState>
						{/each}
					</Stack>

					<Disclosure title="Política de reembolso" icon="refresh">
						<Text tone="secondary">
							{data.product.refundPolicy || 'Política de reembolso ainda não preenchida.'}
						</Text>
					</Disclosure>
				</Stack>
			{:else if data.view === 'checkout'}
				<Stack gap={6}>
					<Cluster justify="between" gap={3}>
						<Text weight="semibold">{data.product.name}</Text>
						<Cluster gap={1}>
							<Text tone="secondary"><Icon name="lock" size="sm" /></Text>
							<Text variant="footnote" tone="secondary">Compra segura</Text>
						</Cluster>
					</Cluster>

					<Text variant="title1" as="h1">Finalizar compra</Text>

					{#if sampleOffer}
						<Card padding="lg" as="section">
							<Stack gap={3}>
								<Text variant="subhead" tone="secondary">
									{checkoutSummary?.title || `Você está comprando ${data.product.name}`}
								</Text>
								<Cluster justify="between" align="baseline" gap={3}>
									<Cluster gap={2} align="center">
										<Text variant="title3" as="h2">{sampleOffer.name}</Text>
										{#if sampleOffer.recurrence === 'monthly'}
											<Badge tone="indigo" size="sm">Mensal</Badge>
										{/if}
									</Cluster>
									<Cluster gap={1} align="baseline" wrap={false}>
										<Money cents={sampleOffer.priceCents} variant="title2" weight="bold" />
										{#if sampleOffer.recurrence === 'monthly'}
											<Text variant="subhead" tone="secondary">/mês</Text>
										{/if}
									</Cluster>
								</Cluster>
								<Divider />
								<Cluster gap={2} wrap={false} align="start">
									<Text tone="secondary"><Icon name="shield" size="sm" /></Text>
									<Text variant="footnote" tone="secondary">
										Garantia de {days(sampleOffer.guaranteeDays)}. {checkoutSummary?.note ?? ''}
									</Text>
								</Cluster>
							</Stack>
						</Card>
					{:else}
						<EmptyState icon="receipt" title="Nenhuma oferta ainda">
							Crie uma oferta para ver o resumo completo do checkout.
							{#snippet action()}
								<Button
									variant="primary"
									href={resolve('/(app)/producer/products/[id]/offers', { id: params.id })}
								>
									Criar uma oferta
								</Button>
							{/snippet}
						</EmptyState>
					{/if}

					<Card variant="frame" padding="lg" as="section">
						{#snippet header()}Dados e forma de pagamento{/snippet}
						<Stack gap={4}>
							<Cluster gap={2}>
								<Badge tone="success" dot>Pix</Badge>
								<Badge>Cartão</Badge>
							</Cluster>
							<Text variant="subhead" tone="secondary">
								No checkout publicado, o comprador informa nome, e-mail e CPF ou CNPJ e paga por Pix
								ou cartão na cor da sua marca.
							</Text>
						</Stack>
					</Card>

					<Disclosure title="Política de reembolso" icon="shield">
						<Text tone="secondary">
							{data.product.refundPolicy || 'Política de reembolso ainda não preenchida.'}
						</Text>
					</Disclosure>
				</Stack>
			{:else if data.view === 'email'}
				<Stack gap={6}>
					<Text variant="title1" as="h1">E-mail de acesso</Text>

					<Card variant="frame" padding="lg" as="article">
						{#snippet header()}
							Para: aluno@exemplo.com · Enviado após a confirmação do pagamento
						{/snippet}
						<Stack gap={6}>
							<Stack gap={1}>
								<Text variant="footnote" tone="secondary">Assunto</Text>
								<Text variant="title2" as="h2">
									{emailFields?.subject || `Seu acesso a ${data.product.name}`}
								</Text>
							</Stack>
							<Divider />
							<Stack gap={3}>
								{#each emailParagraphs as line, index (index)}
									<Text>{line}</Text>
								{:else}
									<Text>
										Olá! Sua compra de {data.product.name} foi confirmada.
									</Text>
								{/each}
							</Stack>
							<Cluster>
								<Button variant="primary" iconEnd="arrow-right">Acessar área de membros</Button>
							</Cluster>
							<Text variant="footnote" tone="secondary">
								No primeiro acesso, este botão leva o aluno a definir a senha; quem já tem conta
								entra direto na área de membros.
							</Text>
						</Stack>
					</Card>
				</Stack>
			{:else if !data.current}
				<EmptyState icon="book" title="Este curso ainda não tem aulas">
					O aluno só vê o conteúdo depois de comprar. Crie ao menos uma aula para conferir como ele
					aparece.
					{#snippet action()}
						<Button
							variant="primary"
							href={resolve('/(app)/producer/products/[id]/content', { id: params.id })}
						>
							Criar aulas
						</Button>
					{/snippet}
				</EmptyState>
			{:else}
				<Stack gap={6}>
					<Stack gap={2}>
						<Text variant="footnote" tone="secondary">Aula atual</Text>
						<Text variant="title2" as="h2">{data.current.title}</Text>
					</Stack>

					{#if video && video.kind !== 'link'}
						<VideoFrame title={data.current.title}>
							{#if video.kind === 'embed'}
								<iframe
									src={video.src}
									title={data.current.title}
									allow="fullscreen; picture-in-picture"
									allowfullscreen
									referrerpolicy="strict-origin-when-cross-origin"
									loading="lazy"
								></iframe>
							{:else}
								<!-- the producer's files carry no captions to offer -->
								<!-- svelte-ignore a11y_media_has_caption -->
								<video src={video.src} controls preload="metadata"></video>
							{/if}
						</VideoFrame>
					{:else if video}
						<Alert tone="info">
							Este vídeo abre em outra página.
							{#snippet action()}
								<Button size="sm" variant="neutral" iconEnd="arrow-up-right" href={video.src}>
									Abrir vídeo
								</Button>
							{/snippet}
						</Alert>
					{/if}

					{#each paragraphs(data.current.body ?? '') as text (text)}
						<Text>{text}</Text>
					{/each}

					{#if data.current.attachmentUrl}
						<Cluster>
							<Button variant="ghost" icon="download" href={data.current.attachmentUrl}>
								Baixar material
							</Button>
						</Cluster>
					{/if}
				</Stack>

				<Card padding="md">
					<LessonList
						label="Aulas do curso"
						current={data.current.id}
						href={lessonHref}
						modules={data.modules}
					/>
				</Card>
			{/if}
		</Stack>
	</Page>
</BrandScope>

<style>
	.visually-hidden {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
