<script lang="ts">
	import { formatDate, type DateFormat } from '../format';

	type Props = {
		/** A UTC instant. Shown in America/Sao_Paulo (RNF-11). */
		value: Date | string;
		format?: DateFormat;
	};

	let { value, format = 'datetime' }: Props = $props();

	const date = $derived(typeof value === 'string' ? new Date(value) : value);
</script>

<!-- the full date stays in the tooltip when a relative one is shown -->
<time
	datetime={date.toISOString()}
	title={format === 'relative' ? formatDate(date, 'datetime') : undefined}
>
	{formatDate(date, format)}
</time>

<style>
	time {
		font-variant-numeric: tabular-nums;
	}
	/* a relative date hides the exact one in its title: a dotted underline says so */
	time[title] {
		text-decoration: underline dotted var(--color-text-tertiary);
		text-underline-offset: 0.25em;
		cursor: help;
	}
</style>
