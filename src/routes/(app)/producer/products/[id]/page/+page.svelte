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

	// after a refusal the sections show what was just typed, with the reason under each field
	const sections = $derived((form && 'typed' in form && form.typed) || data.sections);
	const errors: Record<string, string> = $derived(
		form && 'fields' in form ? (form.fields ?? {}) : {}
	);
	const overview = $derived(resolve('/(app)/producer/products/[id]', { id: params.id }));

	// Open sections are kept by kind, so one stays open when it moves. The first starts open;
	// a refusal opens every section with an error (on the server too, through the fallback).
	const first = untrack(() => data.sections[0]?.kind);
	const opened: Record<string, boolean> = $state(first ? { [first]: true } : {});
	const isOpen = (kind: string, index: number) => opened[kind] ?? sectionHasError(errors, index);
	$effect(() => {
		sections.forEach((section, i) => {
			if (sectionHasError(errors, i)) opened[section.kind] = true;
		});
	});

	// keyboard users keep their place: after a move, focus follows the section that moved
	let moving: { kind: string; direction: 'up' | 'down' } | undefined;
	$effect(() => {
		if (!form || !moving) return;
		const { kind, direction } = moving;
		moving = undefined;
		const index = sections.findIndex((s) => s.kind === kind);
		const buttons = [
			...document.querySelectorAll<HTMLButtonElement>(`button[name="move"][value^="${index}:"]`)
		].filter((button) => !button.disabled);
		(buttons.find((button) => button.value.endsWith(direction)) ?? buttons[0])?.focus();
	});
</script>

<svelte:head><title>Página de venda · {data.product.name}</title></svelte:head>

<Page width="text">
	<form method="post" action="?/save" use:save.enhance>
		<Stack gap={8}>
			<Stack gap={3}>
				<Breadcrumb
					label="Caminho"
					items={[
						{ label: 'Produtos', href: resolve('/(app)/producer') },
						{ label: data.product.name, href: overview },
						{ label: 'Página de venda' }
					]}
				/>
				<!-- the save button comes first, so Enter in a field saves instead of moving a section -->
				<Cluster justify="between" gap={4}>
					<Text variant="title1" as="h1">Página de venda</Text>
					<Button type="submit" variant="primary" loading={save.loading('Salvando')}>
						Salvar alterações
					</Button>
				</Cluster>
				<Text tone="secondary">
					O que o aluno lê antes de comprar, na ordem em que aparece. Abra uma seção para mudar os
					textos ou pôr uma imagem.
				</Text>
			</Stack>

			{#if form && 'saved' in form}
				<Alert tone="success">Alterações salvas.</Alert>
			{:else if form?.code}
				<Alert tone="danger">{errorText(form.code)}</Alert>
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
						</Stack>
					</Disclosure>
				{/each}
			</Stack>
		</Stack>
	</form>
</Page>
