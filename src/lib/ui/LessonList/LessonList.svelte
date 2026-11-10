<script lang="ts">
	import Icon from '../Icon/Icon.svelte';

	type Lesson = { id: string; title: string; duration?: string; done?: boolean };
	type Module = { title: string; lessons: Lesson[] };

	type Props = {
		label: string;
		modules: Module[];
		/** Id of the lesson being watched. */
		current?: string;
		onselect?: (id: string) => void;
	};

	let { label, modules, current = $bindable(), onselect }: Props = $props();
</script>

<nav class="lessons" aria-label={label}>
	{#each modules as module (module.title)}
		<section class="module">
			<h3 class="module-title">{module.title}</h3>
			<ul class="list">
				{#each module.lessons as lesson (lesson.id)}
					<li>
						<button
							class="lesson"
							type="button"
							aria-current={lesson.id === current ? 'true' : undefined}
							data-done={lesson.done}
							onclick={() => {
								current = lesson.id;
								onselect?.(lesson.id);
							}}
						>
							<span class="mark">
								{#if lesson.done}<Icon
										name="check"
										size="sm"
									/>{:else if lesson.id === current}<Icon name="play" size="sm" />{/if}
							</span>
							<span class="title">{lesson.title}</span>
							{#if lesson.duration}<span class="duration">{lesson.duration}</span>{/if}
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</nav>

<style>
	.lessons {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.module-title {
		margin: 0 0 var(--space-1);
		padding-inline: var(--space-3);
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		letter-spacing: var(--text-footnote-tracking);
		font-weight: var(--weight-semibold);
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.lesson {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		inline-size: 100%;
		min-block-size: var(--control-md);
		padding: 0 var(--space-3);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text);
		font: inherit;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		text-align: start;
		cursor: pointer;
		transition: background-color var(--duration-fast) var(--ease-standard);
	}
	.lesson:hover {
		background: var(--color-fill-subtle);
	}
	/* the lesson being watched: accent border and halo */
	.lesson[aria-current='true'] {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 14%, transparent);
	}
	.mark {
		display: grid;
		flex: none;
		place-items: center;
		inline-size: var(--icon-md);
		block-size: var(--icon-md);
		border-radius: var(--radius-pill);
		border: var(--border-width) solid var(--color-border-strong);
		color: var(--color-accent);
	}
	[data-done='true'] .mark {
		border-color: var(--color-success);
		background: var(--color-success);
		color: var(--color-text-on-accent);
	}
	.title {
		flex: 1;
		min-inline-size: 0;
	}
	[data-done='true'] .title {
		color: var(--color-text-secondary);
	}
	.duration {
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		font-variant-numeric: tabular-nums;
	}
</style>
