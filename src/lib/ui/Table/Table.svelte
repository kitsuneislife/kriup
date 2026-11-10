<script lang="ts" generics="T extends Record<string, unknown>">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import Skeleton from '../Skeleton/Skeleton.svelte';

	type Column = {
		key: keyof T & string;
		header: string;
		/** Numbers and money align right, with tabular figures. */
		align?: 'start' | 'end';
		sortable?: boolean;
	};

	type Sort = { key: string; direction: 'asc' | 'desc' };

	type Props = {
		/** Accessible name of the table, read before its content. */
		caption: string;
		columns: Column[];
		rows: T[];
		rowKey: (row: T) => string | number;
		/** Custom cell content, for Badge, Money, Menu. Without it the value is printed as text. */
		cell?: Snippet<[row: T, column: Column]>;
		sort?: Sort;
		onsort?: (sort: Sort) => void;
		loading?: boolean;
		/** Shown instead of the rows when there are none. */
		empty?: Snippet;
	};

	let {
		caption,
		columns,
		rows,
		rowKey,
		cell,
		sort,
		onsort,
		loading = false,
		empty
	}: Props = $props();

	function toggle(column: Column) {
		const direction = sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc';
		onsort?.({ key: column.key, direction });
	}
</script>

<div class="frame">
	<!-- a scrollable region must be reachable by keyboard -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="scroll" role="region" aria-label={caption} tabindex="0">
		<table aria-busy={loading}>
			<caption class="sr-only">{caption}</caption>
			<thead>
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							data-align={column.align}
							aria-sort={sort?.key === column.key
								? sort.direction === 'asc'
									? 'ascending'
									: 'descending'
								: undefined}
						>
							{#if column.sortable}
								<button type="button" class="sort" onclick={() => toggle(column)}>
									{column.header}
									<Icon
										name={sort?.key === column.key
											? sort.direction === 'asc'
												? 'chevron-up'
												: 'chevron-down'
											: 'chevrons-up-down'}
										size="sm"
									/>
								</button>
							{:else}
								{column.header}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if loading}
					{#each [0, 1, 2, 3] as line (line)}
						<tr>
							{#each columns as column (column.key)}
								<td data-align={column.align}><Skeleton lines={1} /></td>
							{/each}
						</tr>
					{/each}
				{:else}
					{#each rows as row (rowKey(row))}
						<tr>
							{#each columns as column (column.key)}
								<td data-align={column.align}>
									{#if cell}{@render cell(row, column)}{:else}{row[column.key]}{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
		{#if !loading && rows.length === 0 && empty}{@render empty()}{/if}
	</div>
</div>

<style>
	/* double border, like Card frame */
	.frame {
		padding: var(--space-1);
		border-radius: var(--radius-xl);
		background: var(--color-bg-app);
		border: var(--border-width) solid var(--color-border);
	}
	.scroll {
		overflow-x: auto;
		border-radius: calc(var(--radius-xl) - var(--space-1));
		background: var(--color-bg-raised);
		border: var(--border-width) solid var(--color-border);
		box-shadow: inset 0 1px 0 var(--color-highlight);
	}
	table {
		inline-size: 100%;
		border-collapse: collapse;
		font-size: var(--text-subhead-size);
		line-height: var(--text-subhead-leading);
		letter-spacing: var(--text-subhead-tracking);
	}
	th,
	td {
		padding: var(--space-3) var(--space-4);
		text-align: start;
		white-space: nowrap;
	}
	th {
		position: sticky;
		inset-block-start: 0;
		background: var(--color-bg-raised);
		color: var(--color-text-secondary);
		font-size: var(--text-footnote-size);
		line-height: var(--text-footnote-leading);
		letter-spacing: var(--text-footnote-tracking);
		font-weight: var(--weight-medium);
		border-block-end: var(--border-width) solid var(--color-hairline);
	}
	td {
		border-block-end: var(--border-width) solid var(--color-hairline);
		transition: background-color var(--duration-fast) var(--ease-standard);
	}
	tbody tr:last-child td {
		border-block-end: 0;
	}
	tbody tr:hover td {
		background: var(--color-fill-subtle);
	}
	[data-align='end'] {
		text-align: end;
		font-variant-numeric: tabular-nums;
	}
	.sort {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	.sort:hover,
	[aria-sort] .sort {
		color: var(--color-text);
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
