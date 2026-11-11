<script lang="ts">
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { brandFonts, productTypeText } from '#lib/product-text';
	import {
		Alert,
		BrandHero,
		Button,
		Card,
		ColorField,
		Page,
		Select,
		Stack,
		Stepper,
		Text,
		TextField
	} from '#lib/ui';
	import { defaultBrandColor, steps } from './steps';

	let { data, form } = $props();
	const next = new Submission();
	const back = new Submission();
	const create = new Submission();

	// after a refusal the fields show what was just typed, with the reason under each one
	const answers = $derived(form?.answers ?? data.answers);
	const errors = $derived(form?.fields ?? {});
	const step = $derived(data.step);
	const last = steps.length - 1;
</script>

<svelte:head><title>Novo produto: {steps[step]!.title}</title></svelte:head>

<Page width="text">
	<Stack gap={8}>
		<Stack gap={6}>
			<Text variant="title1" as="h1">Novo produto</Text>
			<Stepper label="Etapas da criação" steps={steps.map((s) => s.title)} current={step} />
		</Stack>

		<Card padding="lg">
			<Stack gap={4}>
				{#if step < last}
					<form method="post" action="?/next" use:next.enhance>
						<Stack gap={6}>
							<Text variant="title2" as="h2">{steps[step]!.question}</Text>
							{#if step === 0}
								<Select
									name="type"
									label="Tipo de produto"
									options={data.types.map((type) => ({
										value: type,
										label: productTypeText[type].label
									}))}
									value={answers.type ?? data.types[0]}
									error={errors.type}
								/>
							{:else if step === 1}
								<TextField
									name="name"
									label="Nome do produto"
									hint="Você pode mudar depois."
									value={answers.name ?? ''}
									error={errors.name}
								/>
							{:else if step === 2}
								<TextField
									name="price"
									label="Preço em reais"
									hint="A partir de R$ 5,00. Por exemplo: 97,90."
									value={answers.price ?? ''}
									error={errors.price}
								/>
							{:else if step === 3}
								<TextField
									name="audience"
									label="Público"
									hint="Quem vai comprar. Por exemplo: quem nunca fez pão em casa."
									rows={2}
									value={answers.audience ?? ''}
									error={errors.audience}
								/>
							{:else if step === 4}
								<Stack gap={4}>
									<ColorField
										name="color"
										label="Cor principal"
										hint="Aparece nos botões e destaques das suas páginas."
										pickerLabel="Escolher a cor principal"
										value={answers.color ?? defaultBrandColor}
										error={errors.color}
									/>
									<Select
										name="font"
										label="Fonte"
										options={brandFonts.map((font) => ({ value: font, label: font }))}
										value={answers.font ?? brandFonts[0]}
										error={errors.font}
									/>
									<TextField
										name="logoUrl"
										type="url"
										label="Endereço da logo"
										hint="Opcional. O link da imagem, começando com https://."
										value={answers.logoUrl ?? ''}
										error={errors.logoUrl}
									/>
								</Stack>
							{/if}
							<Button
								type="submit"
								variant="primary"
								iconEnd="arrow-right"
								fullWidth
								loading={next.loading('Salvando')}
							>
								Continuar
							</Button>
						</Stack>
					</form>
				{:else if data.brand}
					<form method="post" action="?/create" use:create.enhance>
						<Stack gap={6}>
							<Stack gap={2}>
								<Text variant="title2" as="h2">{steps[step]!.question}</Text>
								<Text tone="secondary">
									Veja como fica o topo da sua página de venda. O modelo também traz os textos,
									as aulas e a política de reembolso, e você ajusta tudo depois.
								</Text>
							</Stack>
							{#if form?.code}<Alert tone="danger">{errorText(form.code)}</Alert>{/if}
							{#each data.previews as preview (preview.slug)}
								<Stack gap={3}>
									<Text variant="title3" as="h3">{preview.name}</Text>
									<BrandHero
										title={preview.title}
										subtitle={preview.subtitle}
										cta={preview.cta}
										color={data.brand.color}
										font={data.brand.font}
										logoUrl={data.brand.logoUrl}
									/>
									<Button
										type="submit"
										name="templateSlug"
										value={preview.slug}
										variant={data.previews.length === 1 ? 'primary' : 'neutral'}
										icon="sparkles"
										fullWidth
										loading={create.loading('Criando')}
									>
										Criar com {preview.name}
									</Button>
								</Stack>
							{/each}
						</Stack>
					</form>
				{/if}
				{#if step > 0}
					<form method="post" action="?/back" use:back.enhance>
						<Button
							type="submit"
							variant="ghost"
							icon="arrow-left"
							fullWidth
							loading={back.loading('Voltando')}
						>
							Voltar
						</Button>
					</form>
				{/if}
			</Stack>
		</Card>
	</Stack>
</Page>
