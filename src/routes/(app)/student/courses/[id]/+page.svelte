<script lang="ts">
	import { resolve } from '$app/paths';
	import { errorText } from '#lib/error-text';
	import { Submission } from '#lib/forms.svelte';
	import {
		Alert,
		BrandScope,
		Breadcrumb,
		Button,
		Card,
		Cluster,
		EmptyState,
		LessonList,
		Page,
		Progress,
		Stack,
		Text,
		VideoFrame
	} from '#lib/ui';
	import { percent, progressText } from '../../progress';
	import { paragraphs, videoOf } from './player';

	let { data, form } = $props();

	const save = new Submission();
	const course = $derived(resolve('/(app)/student/courses/[id]', { id: data.product.id }));
	const lessonHref = (id: string) => `${course}?lesson=${id}`;
	const pct = $derived(percent(data.completedCount, data.lessonCount));
	const video = $derived(data.current?.videoUrl ? videoOf(data.current.videoUrl) : null);
</script>

<svelte:head
	><title>{data.current?.title ?? data.product.name} · {data.product.name}</title></svelte:head
>

<BrandScope color={data.product.brand.color} font={data.product.brand.font}>
	<Page>
		<Stack gap={8}>
			<Stack gap={4}>
				<Breadcrumb
					label="Você está em"
					items={[
						{ label: 'Meus cursos', href: resolve('/(app)/student') },
						{ label: data.product.name }
					]}
				/>
				<Text variant="title1" as="h1">{data.product.name}</Text>
				<Stack gap={2}>
					<Progress
						label="Progresso no curso"
						value={pct}
						tone={pct === 100 ? 'success' : 'accent'}
					/>
					<Text variant="footnote" tone="secondary" numeric>
						{progressText(data.completedCount, data.lessonCount)}{data.lessonCount > 0
							? ` · ${pct}%`
							: ''}
					</Text>
				</Stack>
			</Stack>

			{#if pct === 100 && data.lessonCount > 0}
				<Alert tone="success" title="Curso concluído!">
					Você concluiu todas as aulas deste curso. Você pode rever qualquer aula quando quiser.
				</Alert>
			{/if}

			{#if !data.current}
				<EmptyState icon="book" title="Este curso ainda não tem aulas">
					Assim que o produtor publicar as aulas, elas aparecem aqui.
					{#snippet action()}
						<Button variant="neutral" href={resolve('/(app)/student')}
							>Voltar para meus cursos</Button
						>
					{/snippet}
				</EmptyState>
			{:else}
				<Stack gap={6}>
					<Stack gap={2}>
						<Text variant="footnote" tone="secondary">
							{data.current.moduleTitle} · Aula {data.current.number} de {data.lessonCount}
						</Text>
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

					{#if form?.code}<Alert tone="danger">{errorText(form.code)}</Alert>{/if}

					<Cluster gap={3}>
						<form method="post" action="?/done&lesson={data.current.id}" use:save.enhance>
							{#if data.current.done}
								<Button
									type="submit"
									name="done"
									value="0"
									variant="neutral"
									icon="check"
									loading={save.loading('Salvando')}
								>
									Concluída, desfazer
								</Button>
							{:else}
								<Button
									type="submit"
									name="done"
									value="1"
									variant="primary"
									icon="check"
									loading={save.loading('Salvando')}
								>
									Marcar como concluída
								</Button>
							{/if}
						</form>
						{#if data.prevId}
							<Button variant="ghost" icon="arrow-left" href={lessonHref(data.prevId)}>
								Aula anterior
							</Button>
						{/if}
						{#if data.nextId}
							<Button variant="neutral" iconEnd="arrow-right" href={lessonHref(data.nextId)}>
								Próxima aula
							</Button>
						{/if}
						{#if data.current.attachmentUrl}
							<Button variant="ghost" icon="download" href={data.current.attachmentUrl}>
								Baixar material
							</Button>
						{/if}
					</Cluster>
				</Stack>

				<Card padding="md">
					<LessonList
						label="Aulas do curso"
						current={data.current.id}
						href={lessonHref}
						modules={data.modules.map((m) => ({ title: m.title, lessons: m.lessons }))}
					/>
				</Card>
			{/if}
		</Stack>
	</Page>
</BrandScope>
