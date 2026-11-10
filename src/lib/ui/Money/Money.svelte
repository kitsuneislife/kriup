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

	// "-R$ 1.234,56" -> sign and symbol, whole part, cents. Big amounts set the symbol and
	// the cents smaller, as Wallet does, so the eye reads the reais first.
	const parts = $derived(/^(.*?)([\d.]+)(,\d+)$/.exec(formatMoney(cents)));
	const big = $derived(['title2', 'title1', 'large', 'display'].includes(variant));
</script>

<Text as="span" {variant} {weight} tone={tone ?? (cents < 0 ? 'danger' : 'primary')} numeric>
	{#if big && parts}<span class="minor">{parts[1]}</span>{parts[2]}<span class="minor"
			>{parts[3]}</span
		>{:else}{formatMoney(cents)}{/if}
</Text>

<style>
	.minor {
		font-size: 0.62em;
		font-weight: var(--weight-semibold);
		letter-spacing: 0;
		opacity: 0.6;
	}
</style>
