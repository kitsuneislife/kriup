<script lang="ts">
	import Text from '../Text/Text.svelte';
	import icon from './kriup-icone.png';
</script>

<!-- The product mark: icon plus name. The icon is decorative; the name carries the meaning. -->
<span class="logo">
	<img src={icon} alt="" width="24" height="24" />
	<Text weight="semibold" as="span">Kriup</Text>
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	img {
		border-radius: var(--radius-xs);
	}
</style>
