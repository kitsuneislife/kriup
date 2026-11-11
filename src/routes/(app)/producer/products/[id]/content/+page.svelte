<script lang="ts">
	import { resolve } from '$app/paths';
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
		Page,
		Stack,
		Text,
		TextField
	} from '#lib/ui';
	import ConfirmDelete from '../ConfirmDelete.svelte';

	let { data, form, params } = $props();

	// one Submission for the edit forms and one for the add forms (those empty themselves);
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
	// a move or a delete has no form of its own to show a refusal on: it goes on top
	const pageError = $derived(
		form && 'code' in form && /^(move|delete):/.test(form.for) ? form.code : undefined
	);

	const action = (name: string, id: string) => `?/${name}&id=${id}`;
	const lessonSummary = (lesson: (typeof data.modules)[number]['lessons'][number]) =>
		[lesson.videoUrl && 'Vídeo', lesson.body && 'Texto', lesson.attachmentUrl && 'Anexo']
			.filter(Boolean)
			.join(' · ') || 'Só o título';
	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

	// lessons open by id, so one stays open when it moves; a refusal opens its lesson
	const opened: Record<string, boolean> = $state({});
	const isOpen = (id: string) => opened[id] ?? form?.for === `lesson:${id}`;

	const directions = [
		{ direction: 'up', icon: 'chevron-up', text: 'Subir' },
		{ direction: 'down', icon: 'chevron-down', text: 'Descer' }
	] as const;

	// keyboard users keep their place: after a move, focus follows what moved
	let moving: { id: string; direction: 'up' | 'down' } | undefined;
	$effect(() => {
		if (!form || !moving) return;
		const { id, direction } = moving;
		moving = undefined;
		const buttons = [
			...document.querySelectorAll<HTMLButtonElement>(`form[data-move="${id}"] button`)
		].filter((button) => !button.disabled);
		(buttons.find((button) => button.value === direction) ?? buttons[0])?.focus();
	});
</script>

<svelte:head><title>Conteúdo · {data.product.name}</title></svelte:head>

{#snippet moveButtons(
	name: 'moveModule' | 'moveLesson',
	id: string,
	index: number,
	count: number,
	noun: string
)}
	<form method="post" action={action(name, id)} data-move={id} use:edit.enhance>
		<Cluster gap={2}>
			{#each directions as button (button.direction)}
				<Button
					type="submit"
					size="sm"
					icon={button.icon}
					name="direction"
					value={button.direction}
					disabled={index === (button.direction === 'up' ? 0 : count - 1)}
					onclick={() => (moving = { id, direction: button.direction })}
				>
					{button.text}
					{noun}
				</Button>
			{/each}
		</Cluster>
	</form>
{/snippet}

{#snippet saved(key: string, text: string)}
	{@const answer = answerFor(key)}
	{#if answer && 'saved' in answer}
		<Alert tone="success">{text}</Alert>
	{:else if answer && 'code' in answer}
		<Alert tone="danger">{errorText(answer.code)}</Alert>
	{/if}
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
					{ label: 'Conteúdo' }
				]}
			/>
			<Text variant="title1" as="h1">Conteúdo</Text>
			<Text tone="secondary">
				Os módulos e as aulas na ordem em que o aluno vê. Cada aula precisa de um título; vídeo,
				texto e material anexo são opcionais.
			</Text>
		</Stack>

		{#if pageError}<Alert tone="danger">{errorText(pageError)}</Alert>{/if}

		{#if data.modules.length === 0}
			<EmptyState icon="book" title="Nenhum módulo ainda">
				Os módulos agrupam as aulas. Crie o primeiro abaixo e depois adicione as aulas nele.
			</EmptyState>
		{/if}

		{#each data.modules as mod, m (mod.id)}
			{@const moduleKey = `module:${mod.id}`}
			{@const newLessonKey = `new-lesson:${mod.id}`}
			<Card variant="frame" as="section">
				{#snippet header()}
					<Stack gap={1}>
						<Text variant="footnote" tone="secondary">
							Módulo {m + 1} · {plural(mod.lessons.length, 'aula', 'aulas')}
						</Text>
						<Text variant="title3" as="h2">{mod.title}</Text>
					</Stack>
				{/snippet}
				<Stack gap={6}>
					<form
						method="post"
						action={action('renameModule', mod.id)}
						use:edit.enhance
						onsubmit={() => (active = moduleKey)}
					>
						<Stack gap={3}>
							<TextField
								name="title"
								label="Nome do módulo"
								value={typedOf(moduleKey)?.title ?? mod.title}
								error={errorsOf(moduleKey).title}
							/>
							{@render saved(moduleKey, 'Nome salvo.')}
							<Cluster>
								<Button type="submit" size="sm" loading={loading(moduleKey, 'Salvando')}>
									Salvar nome
								</Button>
							</Cluster>
						</Stack>
					</form>

					<Stack gap={3}>
						{#if mod.lessons.length === 0}
							<Text tone="secondary">Nenhuma aula neste módulo ainda.</Text>
						{/if}
						{#each mod.lessons as lesson, l (lesson.id)}
							{@const lessonKey = `lesson:${lesson.id}`}
							{@const typed = typedOf(lessonKey)}
							{@const errors = errorsOf(lessonKey)}
							<Disclosure
								title={lesson.title}
								summary={lessonSummary(lesson)}
								bind:open={() => isOpen(lesson.id), (open) => (opened[lesson.id] = open)}
							>
								<Stack gap={4}>
									<form
										method="post"
										action={action('updateLesson', lesson.id)}
										use:edit.enhance
										onsubmit={() => (active = lessonKey)}
									>
										<Stack gap={4}>
											<TextField
												name="title"
												label="Título da aula"
												value={typed?.title ?? lesson.title}
												error={errors.title}
											/>
											<TextField
												name="videoUrl"
												type="url"
												label="Vídeo"
												hint="Opcional. O link do vídeo, começando com https://."
												value={typed?.videoUrl ?? lesson.videoUrl ?? ''}
												error={errors.videoUrl}
											/>
											<TextField
												name="body"
												label="Texto da aula"
												hint="Opcional. Um resumo, um roteiro ou um exercício."
												rows={6}
												value={typed?.body ?? lesson.body ?? ''}
												error={errors.body}
											/>
											<TextField
												name="attachmentUrl"
												type="url"
												label="Material anexo"
												hint="Opcional. O link do arquivo, como um PDF, começando com https://."
												value={typed?.attachmentUrl ?? lesson.attachmentUrl ?? ''}
												error={errors.attachmentUrl}
											/>
											{@render saved(lessonKey, 'Aula salva.')}
											<Cluster>
												<Button type="submit" loading={loading(lessonKey, 'Salvando')}>
													Salvar aula
												</Button>
											</Cluster>
										</Stack>
									</form>
									<Divider />
									<Cluster justify="between" gap={2}>
										{@render moveButtons('moveLesson', lesson.id, l, mod.lessons.length, 'aula')}
										<ConfirmDelete
											action={action('deleteLesson', lesson.id)}
											label="Apagar aula"
											title="Apagar a aula {lesson.title}?"
										>
											O progresso dos alunos nesta aula também é apagado. Não dá para desfazer.
										</ConfirmDelete>
									</Cluster>
								</Stack>
							</Disclosure>
						{/each}
					</Stack>

					<form
						method="post"
						action={action('addLesson', mod.id)}
						use:add.enhance
						onsubmit={() => (active = newLessonKey)}
					>
						<Stack gap={3}>
							<TextField
								name="title"
								label="Nova aula em {mod.title}"
								placeholder="Título da aula"
								value={typedOf(newLessonKey)?.title ?? ''}
								error={errorsOf(newLessonKey).title}
							/>
							<Cluster>
								<Button
									type="submit"
									size="sm"
									icon="plus"
									loading={loading(newLessonKey, 'Adicionando')}
								>
									Adicionar aula
								</Button>
							</Cluster>
						</Stack>
					</form>

					<Divider />
					<Cluster justify="between" gap={2}>
						{@render moveButtons('moveModule', mod.id, m, data.modules.length, 'módulo')}
						<ConfirmDelete
							action={action('deleteModule', mod.id)}
							label="Apagar módulo"
							title="Apagar o módulo {mod.title}?"
						>
							{mod.lessons.length === 0
								? 'O módulo está vazio. Não dá para desfazer.'
								: `As ${plural(mod.lessons.length, 'aula', 'aulas')} dele e o progresso dos alunos nelas também são apagados. Não dá para desfazer.`}
						</ConfirmDelete>
					</Cluster>
				</Stack>
			</Card>
		{/each}

		<form
			method="post"
			action="?/addModule"
			use:add.enhance
			onsubmit={() => (active = 'new-module')}
		>
			<Stack gap={3}>
				<Text variant="title3" as="h2">Novo módulo</Text>
				<TextField
					name="title"
					label="Nome do novo módulo"
					value={typedOf('new-module')?.title ?? ''}
					error={errorsOf('new-module').title}
				/>
				<Cluster>
					<Button
						type="submit"
						variant="primary"
						icon="plus"
						loading={loading('new-module', 'Adicionando')}
					>
						Adicionar módulo
					</Button>
				</Cluster>
			</Stack>
		</form>
	</Stack>
</Page>
