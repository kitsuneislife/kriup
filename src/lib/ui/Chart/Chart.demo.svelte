<script lang="ts">
	import { Card, Chart, Grid, Money, Stack, Text } from '../index';

	const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
	const cents = [12000, 34000, 18000, 52000, 41000, 66000, 59000];
</script>

<Grid min="lg" gap={4}>
	<Card>
		<Stack gap={3}>
			<Text variant="subhead" weight="semibold">Vendas da semana</Text>
			<Money cents={282000} variant="title1" weight="semibold" />
			<Chart label="Vendas da semana" values={cents} labels={['Seg', 'Dom']} />
		</Stack>
	</Card>
	<Card>
		<Stack gap={3}>
			<Text variant="subhead" weight="semibold">Pedidos por dia</Text>
			<Chart
				kind="bar"
				label="Pedidos por dia"
				values={[3, 8, 5, 11, 9, 14, 12]}
				labels={days}
				tone="success"
			/>
		</Stack>
	</Card>
	<Card>
		<Stack gap={3}>
			<Text variant="subhead" weight="semibold">Reembolsos</Text>
			<Chart
				kind="bar"
				label="Reembolsos por dia"
				values={[0, 1, 0, 2, 0, 0, 1]}
				labels={days}
				tone="indigo"
			/>
		</Stack>
	</Card>
</Grid>
