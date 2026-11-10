<script lang="ts">
	import { Badge, Card, NavItem, Stack } from '../index';
</script>

<Card padding="sm">
	<Stack gap={1} as="nav">
		<NavItem href="#NavItem" icon="home" current>Início</NavItem>
		<NavItem href="#NavItem" icon="package">Produtos</NavItem>
		<NavItem href="#NavItem" icon="wallet">Dinheiro</NavItem>
		<NavItem href="#NavItem" icon="refresh">
			Reembolsos
			{#snippet trailing()}<Badge tone="warning" size="sm">3</Badge>{/snippet}
		</NavItem>
		<NavItem href="#NavItem" icon="settings">Configurações</NavItem>
	</Stack>
</Card>
