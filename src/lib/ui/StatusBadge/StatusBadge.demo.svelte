<script lang="ts">
	import { Cluster, Stack, StatusBadge, Text } from '../index';
</script>

<Stack gap={4}>
	<Stack gap={2}>
		<Text variant="footnote" tone="secondary">Pedido</Text>
		<Cluster gap={2}>
			<StatusBadge status="aguardando" label="Aguardando" />
			<StatusBadge status="pago" label="Pago" />
			<StatusBadge status="expirado" label="Expirado" />
			<StatusBadge status="recusado" label="Recusado" />
			<StatusBadge status="reembolsado" label="Reembolsado" />
		</Cluster>
	</Stack>
	<Stack gap={2}>
		<Text variant="footnote" tone="secondary">Reembolso</Text>
		<Cluster gap={2}>
			<StatusBadge status="aberto" label="Aberto" />
			<StatusBadge status="aprovado" label="Aprovado" />
			<StatusBadge status="com_produtor" label="Com o produtor" />
			<StatusBadge status="com_plataforma" label="Com a plataforma" />
			<StatusBadge status="recusado_final" label="Recusado" />
			<StatusBadge status="concluido" label="Concluído" />
		</Cluster>
	</Stack>
	<Stack gap={2}>
		<Text variant="footnote" tone="secondary">Saldo</Text>
		<Cluster gap={2}>
			<StatusBadge status="retido" label="Retido" size="sm" />
			<StatusBadge status="liberado" label="Liberado" size="sm" />
			<StatusBadge status="sacado" label="Sacado" size="sm" />
			<StatusBadge status="estornado" label="Estornado" size="sm" />
		</Cluster>
	</Stack>
</Stack>
