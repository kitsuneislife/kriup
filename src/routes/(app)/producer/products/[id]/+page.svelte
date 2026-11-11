<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { brandFonts, pendencyText, productStatusText, productTypeText } from '#lib/product-text';
	import {
		Alert,
		Badge,
		Breadcrumb,
		Button,
		Checklist,
		Cluster,
		ColorField,
		Page,
		Select,
		Stack,
		Tabs,
		Text,
		TextField
	} from '#lib/ui';

	let { data, form } = $props();
	const save = new Submission();

	const status = $derived(productStatusText[data.product.status]);
	const pendencies = $derived(
		(Object.keys(pendencyText) as (keyof typeof pendencyText)[]).map((pendency) => ({
			label: pendencyText[pendency],
			done: !data.pendencies.includes(pendency),
			// the other pendencies get their link when their screens exist (batches 2.5 to 2.7)
			href: pendency === 'refund_policy' ? '?tab=data' : undefined
		}))
	);
	// after a refusal the fields show what was just typed, with the reason under each one
	const typed = $derived(form && 'typed' in form ? form.typed : undefined);
	const errors = $derived(form && 'fields' in form ? (form.fields ?? {}) : {});
	const fonts = $derived(
		brandFonts.includes(data.product.brand.font)
			? brandFonts
			: [data.product.brand.font, ...brandFonts]
	);

	// ?tab=data opens the form, so a link reaches it even without JavaScript
	let tab = $derived(page.url.searchParams.get('tab') === 'data' || form ? 'data' : 'overview');
</script>

<svelte:head><title>{data.product.name}</title></svelte:head>

<Page>
	<Stack gap={8}>
		<Stack gap={3}>
			<Breadcrumb
				label="Caminho"
				items={[
					{ label: 'Produtos', href: resolve('/(app)/producer') },
					{ label: data.product.name }
				]}
			/>
			<Text variant="title1" as="h1">{data.product.name}</Text>
			<Cluster>
				<Badge tone={status.tone} dot>{status.label}</Badge>
				<Badge>{productTypeText[data.product.type].label}</Badge>
			</Cluster>
		</Stack>

		<Tabs
			label="Seções do produto"
			bind:value={tab}
			tabs={[
				{ value: 'overview', label: 'Resumo', icon: 'check' },
				{ value: 'data', label: 'Dados básicos', icon: 'edit' }
			]}
		>
			{#snippet children(current)}
				{#if current === 'overview'}
					<Stack gap={4}>
						<Text variant="title2" as="h2">Antes de publicar</Text>
						<Checklist
							label="Pendências para publicar"
							items={pendencies}
							count={(done, total) => `${done} de ${total} prontos`}
						/>
						<Text tone="secondary">
							{data.lessonCount}
							{data.lessonCount === 1 ? 'aula' : 'aulas'} e {data.offerCount}
							{data.offerCount === 1 ? 'oferta' : 'ofertas'} até agora.
						</Text>
					</Stack>
				{:else}
					<form method="post" action="?/update" use:save.enhance>
						<Stack gap={6}>
							<Text variant="title2" as="h2">Dados básicos</Text>
							{#if form && 'saved' in form}
								<Alert tone="success">Alterações salvas.</Alert>
							{:else if form?.code && !('typed' in form)}
								<Alert tone="danger">{errorText(form.code)}</Alert>
							{/if}
							<TextField
								name="name"
								label="Nome do produto"
								value={typed?.name ?? data.product.name}
								error={errors.name}
							/>
							<ColorField
								name="color"
								label="Cor principal"
								hint="Aparece nos botões e destaques das suas páginas."
								pickerLabel="Escolher a cor principal"
								value={typed?.color ?? data.product.brand.color}
								error={errors.color}
							/>
							<Select
								name="font"
								label="Fonte"
								options={fonts.map((font) => ({ value: font, label: font }))}
								value={typed?.font ?? data.product.brand.font}
								error={errors.font}
							/>
							<TextField
								name="logoUrl"
								type="url"
								label="Endereço da logo"
								hint="Opcional. O link da imagem, começando com https://."
								value={typed?.logoUrl ?? data.product.brand.logoUrl ?? ''}
								error={errors.logoUrl}
							/>
							<TextField
								name="refundPolicy"
								label="Política de reembolso"
								hint="O aluno lê antes de comprar. A garantia mínima é de 7 dias."
								rows={5}
								value={typed?.refundPolicy ?? data.product.refundPolicy}
								error={errors.refundPolicy}
							/>
							<Button type="submit" variant="primary" loading={save.loading('Salvando')}>
								Salvar alterações
							</Button>
						</Stack>
					</form>
				{/if}
			{/snippet}
		</Tabs>
	</Stack>
</Page>
