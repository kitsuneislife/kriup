<script lang="ts">
	import { Button, Grid, Stack, Text, Timeline } from '../index';
</script>

<Grid min="lg" gap={6}>
	<Stack gap={3}>
		<Text variant="subhead" weight="semibold">Pedido de reembolso</Text>
		<Timeline
			label="Andamento do reembolso"
			items={[
				{
					title: 'Pedido aberto',
					time: '8 nov, 14:20',
					description: 'Pelo aluno, dentro do prazo.'
				},
				{
					title: 'Com o produtor',
					time: '9 nov, 09:00',
					state: 'current',
					tone: 'warning',
					description: 'Responde até 12 nov.'
				},
				{ title: 'Decisão', state: 'upcoming' },
				{ title: 'Reembolso concluído', state: 'upcoming', tone: 'indigo' }
			]}
		/>
	</Stack>
	<Stack gap={3}>
		<Text variant="subhead" weight="semibold">Próximas liberações</Text>
		<Timeline
			label="Liberações previstas"
			items={[
				{ title: 'R$ 197,00 liberado', time: 'Hoje', tone: 'success' },
				{ title: 'R$ 490,00 libera em 3 dias', time: '13 nov', state: 'current', tone: 'warning' },
				{ title: 'R$ 29,00 libera em 12 dias', time: '22 nov', state: 'upcoming' }
			]}
		>
			{#snippet extra(item)}
				{#if item.state === 'current'}
					<Button size="sm" variant="ghost" icon="eye">Ver detalhes</Button>
				{/if}
			{/snippet}
		</Timeline>
	</Stack>
</Grid>
