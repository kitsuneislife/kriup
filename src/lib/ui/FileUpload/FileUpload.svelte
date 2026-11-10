<script lang="ts">
	import Button from '../Button/Button.svelte';
	import Icon from '../Icon/Icon.svelte';
	import { formatBytes, splitFiles, type Rejection } from './files';

	type Props = {
		/** Main text of the drop area, for example "Arraste o logo ou escolha um arquivo". */
		label: string;
		hint?: string;
		error?: string;
		/** Same format as the input attribute: "image/*", "image/png", ".pdf". */
		accept?: string[];
		maxBytes?: number;
		multiple?: boolean;
		files?: File[];
		/** Files that failed the type or size rule. Show the message in `error`. */
		onreject?: (rejected: Rejection[]) => void;
		/** Accessible name of the remove button of a file. */
		removeLabel: (name: string) => string;
	};

	let {
		label,
		hint,
		error,
		accept = [],
		maxBytes,
		multiple = false,
		files = $bindable([]),
		onreject,
		removeLabel
	}: Props = $props();

	const id = $props.id();
	let dragging = $state(false);

	function take(list: FileList | null) {
		const { accepted, rejected } = splitFiles([...(list ?? [])], { accept, maxBytes });
		if (accepted.length) files = multiple ? [...files, ...accepted] : accepted.slice(0, 1);
		if (rejected.length) onreject?.(rejected);
	}
</script>

<div class="upload">
	<div
		class="drop"
		data-dragging={dragging}
		data-invalid={error !== undefined}
		role="presentation"
		ondragover={(event) => {
			event.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={(event) => {
			event.preventDefault();
			dragging = false;
			take(event.dataTransfer?.files ?? null);
		}}
	>
		<label class="area" for={id}>
			<span class="icon"><Icon name="upload" /></span>
			<span class="label">{label}</span>
			{#if hint}<span class="hint">{hint}</span>{/if}
		</label>
		<input
			{id}
			class="input"
			type="file"
			{multiple}
			accept={accept.join(',')}
			aria-invalid={error ? true : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
			onchange={(event) => {
				take(event.currentTarget.files);
				event.currentTarget.value = '';
			}}
		/>
	</div>
	{#if error}<p class="error" id="{id}-error" role="alert">{error}</p>{/if}
	{#if files.length}
		<ul class="files">
			{#each files as file, index (file.name + index)}
				<li class="file">
					<span class="file-icon"><Icon name="file" size="sm" /></span>
					<span class="name">{file.name}</span>
					<span class="size">{formatBytes(file.size)}</span>
					<Button
						variant="ghost"
						size="sm"
						icon="x"
						label={removeLabel(file.name)}
						onclick={() => (files = files.filter((_, at) => at !== index))}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.upload {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.drop {
		position: relative;
		border-radius: var(--radius-lg);
		border: var(--border-width) dashed var(--color-border-strong);
		background: var(--color-bg-field);
		transition:
			border-color var(--duration-fast) var(--ease-standard),
			background-color var(--duration-fast) var(--ease-standard),
			box-shadow var(--duration-fast) var(--ease-standard);
	}
	.drop:hover,
	.drop:focus-within,
	[data-dragging='true'] {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-bg-field));
	}
	[data-dragging='true'],
	.drop:focus-within {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent);
	}
	[data-invalid='true'] {
		border-color: var(--color-danger);
	}
	.area {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-6) var(--space-4);
		text-align: center;
		cursor: pointer;
	}
	.icon {
		display: grid;
		place-items: center;
		inline-size: var(--control-md);
		block-size: var(--control-md);
		margin-block-end: var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--color-fill);
		color: var(--color-text-secondary);
	}
	.label {
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
		font-weight: var(--weight-medium);
	}
	.hint {
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
	}
	/* visually hidden, still focusable, so the keyboard opens the file picker */
	.input {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		opacity: 0;
		pointer-events: none;
	}
	.error {
		color: var(--color-danger);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
	}
	.files {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.file {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
		border-radius: var(--radius-pill);
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
	}
	.file-icon {
		display: inline-flex;
		color: var(--color-text-secondary);
	}
	.name {
		flex: 1;
		min-inline-size: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.size {
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
</style>
