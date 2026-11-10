<script lang="ts">
	import { Card, Grid, Money, Stat } from '../index';
</script>

<Grid min="md" gap={4}>
	<Card>
		<Stat label="Retido" icon="clock" tone="warning" hint="Libera em 3 dias">
			<Money cents={49000} variant="title1" weight="semibold" />
		</Stat>
	</Card>
	<Card>
		<Stat label="Liberado" icon="check-circle" tone="success" hint="Pronto para sacar">
			<Money cents={19700} variant="title1" weight="semibold" />
		</Stat>
	</Card>
	<Card>
		<Stat label="Sacado" icon="wallet" hint="Neste mês">
			<Money cents={125000} variant="title1" weight="semibold" />
		</Stat>
	</Card>
</Grid>
