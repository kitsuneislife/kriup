<script lang="ts">
	import { formatMoney } from '../format';
	import Text from '../Text/Text.svelte';

	type Props = {
		/** Integer cents. Never a float (RNF-01). */
		cents: number;
		variant?:
			'footnote' | 'subhead' | 'body' | 'title3' | 'title2' | 'title1' | 'large' | 'display';
		/** Negative values read as danger unless a tone is given. */
		tone?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
		weight?: 'regular' | 'medium' | 'semibold' | 'bold';
	};

	let { cents, variant = 'body', tone, weight }: Props = $props();
</script>

<Text as="span" {variant} {weight} tone={tone ?? (cents < 0 ? 'danger' : 'primary')} numeric>
	{formatMoney(cents)}
</Text>
