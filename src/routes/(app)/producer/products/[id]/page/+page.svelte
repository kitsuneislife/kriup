<script lang="ts">
	import { resolve } from '$app/paths';
	import { textFields } from '#lib/domain/page';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import { inReadingOrder, pageFieldText, sectionText } from '#lib/product-text';
	import {
		Alert,
		Breadcrumb,
		Button,
		Cluster,
		Disclosure,
		Page,
		Stack,
		Text,
		TextField
	} from '#lib/ui';
	import { untrack } from 'svelte';
	import { sectionHasError } from './sections';

	let { data, form, params } = $props();
	const save = new Submission();

	const pageMeta: Record<typeof data.type, { title: string; nav: string; description: string }> = {
		sales: {
			title: 'Página de venda',
			nav: 'Página de venda',
			description:
				'O que o aluno lê antes de comprar, na ordem em que aparece. Abra uma seção para mudar os textos ou pôr uma imagem.'
		},
		checkout: {
			title: 'Página de checkout',
			nav: 'Checkout',
			description:
				'O resumo e a observação exibidos ao aluno na tela de pagamento antes de concluir a compra.'
		},
		access_email: {
			title: 'E-mail de acesso',
			nav: 'E-mail de acesso',
			description: 'O assunto e a mensagem enviados por e-mail assim que o pagamento é confirmado.'
		}
	};

	const currentForm = $derived(form && form.type === data.type ? form : undefined);
	// after a refusal the sections show what was just typed, with the reason under each field
	const sections = $derived(
		(currentForm && 'typed' in currentForm && currentForm.typed) || data.sections
	);
	const errors: Record<string, string> = $derived(
		currentForm && 'fields' in currentForm ? (currentForm.fields ?? {}) : {}
	);
	const overview = $derived(resolve('/(app)/producer/products/[id]', { id: params.id }));
	const editorHref = $derived(resolve('/(app)/producer/products/[id]/page', { id: params.id }));
	const meta = $derived(pageMeta[data.type]);

	// Open sections are kept by kind, so one stays open when it moves. The first of each page
	// starts open; a refusal opens every section with an error (on the server too, via fallback).
	const first = untrack(() => data.sections[0]?.kind);
	const opened: Record<string, boolean> = $state(first ? { [first]: true } : {});
	const noneTouched = $derived(sections.every((s) => !(s.kind in opened)));
	const isOpen = (kind: string, index: number) =>
		opened[kind] ?? ((noneTouched && index === 0) || sectionHasError(errors, index));
	$effect(() => {
		const initial = data.sections[0]?.kind;
		if (initial && data.sections.every((s) => !(s.kind in opened))) {
			opened[initial] = true;
		}
		sections.forEach((section, i) => {
			if (sectionHasError(errors, i)) opened[section.kind] = true;
		});
	});

	// keyboard users keep their place: after a move, focus follows the section that moved
	let moving: { kind: string; direction: 'up' | 'down' } | undefined;
	$effect(() => {
		if (!currentForm || !moving) return;
		const { kind, direction } = moving;
		moving = undefined;
		const index = sections.findIndex((s) => s.kind === kind);
		const buttons = [
			...document.querySelectorAll<HTMLButtonElement>(`button[name="move"][value^="${index}:"]`)
		].filter((button) => !button.disabled);
		(buttons.find((button) => button.value.endsWith(direction)) ?? buttons[0])?.focus();
	});
</script>

<svelte:head><title>{meta.title} · {data.product.name}</title></svelte:head>

<Page width="text">
	<form
		method="post"
		action={data.type === 'sales' ? '?/save' : `?/save&type=${data.type}`}
		use:save.enhance
	>
		<Stack gap={8}>
			<Stack gap={3}>
				<Breadcrumb
					label="Caminho"
					items={[
						{ label: 'Produtos', href: resolve('/(app)/producer') },
						{ label: data.product.name, href: overview },
						{ label: meta.title }
					]}
				/>
				<nav aria-label="Páginas do produto">
					<Cluster gap={2}>
						<Button
							size="sm"
							variant={data.type === 'sales' ? 'primary' : 'neutral'}
							href={editorHref}
						>
							Página de venda
						</Button>
						<Button
							size="sm"
							variant={data.type === 'checkout' ? 'primary' : 'neutral'}
							href="{editorHref}?type=checkout"
						>
							Checkout
						</Button>
						<Button
							size="sm"
							variant={data.type === 'access_email' ? 'primary' : 'neutral'}
							href="{editorHref}?type=access_email"
						>
							E-mail de acesso
						</Button>
					</Cluster>
				</nav>
				<!-- the save button comes first, so Enter in a field saves instead of moving a section -->
				<Cluster justify="between" gap={4}>
					<Text variant="title1" as="h1">{meta.title}</Text>
					<Button type="submit" variant="primary" loading={save.loading('Salvando')}>
						Salvar alterações
					</Button>
				</Cluster>
				<Text tone="secondary">{meta.description}</Text>
			</Stack>

			{#if currentForm && 'saved' in currentForm}
				<Alert tone="success">Alterações salvas.</Alert>
			{:else if currentForm?.code}
				<Alert tone="danger">{errorText(currentForm.code)}</Alert>
			{/if}

			<Stack gap={3}>
				{#each sections as section, i (section.kind)}
					{@const path = `sections.${i}`}
					{@const name = `${path}.${section.kind}`}
					<Disclosure
						title={sectionText[section.kind] ?? section.kind}
						summary="{i + 1} de {sections.length}"
						bind:open={() => isOpen(section.kind, i), (open) => (opened[section.kind] = open)}
					>
						<Stack gap={4}>
							{#each inReadingOrder(textFields(section)) as key (key)}
								{@const field = pageFieldText(key)}
								<TextField
									name="{name}.{key}"
									label={field.label}
									rows={field.long ? 3 : undefined}
									value={section.fields[key]}
									error={errors[`${path}.fields.${key}`]}
								/>
							{/each}
							{#if data.type === 'sales'}
								<TextField
									name="{name}.image"
									type="url"
									label="Imagem"
									hint="Opcional. O link da imagem, começando com https://."
									value={section.fields.image ?? ''}
									error={errors[`${path}.fields.image`]}
								/>
								<TextField
									name="{name}.imageAlt"
									label="Descrição da imagem"
									hint="Se puser uma imagem, diga o que ela mostra para quem não consegue vê-la."
									value={section.fields.imageAlt ?? ''}
									error={errors[`${path}.fields.imageAlt`]}
								/>
							{/if}
							{#if sections.length > 1}
								<Cluster gap={2}>
									<Button
										type="submit"
										size="sm"
										icon="chevron-up"
										name="move"
										value="{i}:up"
										disabled={i === 0}
										onclick={() => (moving = { kind: section.kind, direction: 'up' })}
									>
										Subir seção
									</Button>
									<Button
										type="submit"
										size="sm"
										icon="chevron-down"
										name="move"
										value="{i}:down"
										disabled={i === sections.length - 1}
										onclick={() => (moving = { kind: section.kind, direction: 'down' })}
									>
										Descer seção
									</Button>
								</Cluster>
							{/if}
						</Stack>
					</Disclosure>
				{/each}
			</Stack>
		</Stack>
	</form>
</Page>
