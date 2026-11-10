<script lang="ts">
	import { DateTime, Stack, Text } from '../index';

	const sale = '2026-11-10T15:30:00Z';
	const release = new Date(Date.now() + 3 * 86_400_000);
</script>

<Stack gap={2}>
	<Text><DateTime value={sale} /> · data e hora</Text>
	<Text><DateTime value={sale} format="date" /> · só a data</Text>
	<Text><DateTime value={sale} format="time" /> · só a hora</Text>
	<Text><DateTime value={release} format="relative" /> · relativa</Text>
</Stack>
