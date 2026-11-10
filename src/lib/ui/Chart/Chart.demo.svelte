<script lang="ts">
	import { Card, Chart, Grid, Money, Stack, Text } from '../index';

	const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
	const cents = [12000, 34000, 18000, 52000, 41000, 66000, 59000];
	const orders = [3, 8, 5, 11, 9, 14, 12];
	const refunds = [0, 1, 0, 2, 0, 0, 1];
	const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
</script>

<Stack gap={4}>
	<Card>
		<Stack gap={3}>
			<Text variant="subhead" tone="secondary">Vendas da semana</Text>
			<Money cents={sum(cents)} variant="title1" weight="semibold" />
			<Chart label="Vendas da semana" values={cents} labels={['Seg', 'Dom']} />
		</Stack>
	</Card>
	<Grid min="lg" gap={4}>
		<Card>
			<Stack gap={3}>
				<Text variant="subhead" tone="secondary">Pedidos por dia</Text>
				<Text variant="title2" weight="semibold" numeric>{sum(orders)}</Text>
				<Chart kind="bar" label="Pedidos por dia" values={orders} labels={days} tone="success" />
			</Stack>
		</Card>
		<Card>
			<Stack gap={3}>
				<Text variant="subhead" tone="secondary">Reembolsos</Text>
				<Text variant="title2" weight="semibold" numeric>{sum(refunds)}</Text>
				<Chart kind="bar" label="Reembolsos por dia" values={refunds} labels={days} tone="indigo" />
			</Stack>
		</Card>
	</Grid>
</Stack>
