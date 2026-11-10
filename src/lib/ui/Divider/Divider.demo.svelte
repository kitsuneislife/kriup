<script lang="ts">
	import { Cluster, Divider, Stack, Text } from '../index';
</script>

<Stack gap={4}>
	<Text>Acima</Text>
	<Divider />
	<Text>Abaixo</Text>
	<Cluster gap={4}>
		<Text>Vendas</Text>
		<Divider orientation="vertical" />
		<Text>Reembolsos</Text>
		<Divider orientation="vertical" />
		<Text>Saques</Text>
	</Cluster>
</Stack>
