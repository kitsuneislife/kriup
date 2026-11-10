<script lang="ts">
	import { Cluster, Money, Stack } from '../index';
</script>

<Stack gap={3}>
	<Money cents={123456} variant="display" weight="bold" />
	<Cluster gap={6} align="baseline">
		<Money cents={19700} variant="title2" />
		<Money cents={4990} />
		<Money cents={5} variant="subhead" tone="secondary" />
		<Money cents={-1990} />
		<Money cents={0} tone="success" weight="semibold" />
	</Cluster>
</Stack>
