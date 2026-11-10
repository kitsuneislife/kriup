<script lang="ts">
	import { Button, Cluster, Tooltip } from '../index';
</script>

<Cluster gap={4} align="center">
	<Tooltip text="Copiar link">
		<Button variant="ghost" icon="copy" label="Copiar link" />
	</Tooltip>
	<Tooltip text="Excluir produto" placement="bottom">
		<Button variant="ghost" icon="trash" label="Excluir produto" />
	</Tooltip>
	<Tooltip text="Liberado em 3 dias">
		<Button size="sm" icon="clock">Retido</Button>
	</Tooltip>
</Cluster>
