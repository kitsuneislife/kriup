<script lang="ts">
	import { Card, Checklist } from '../index';
</script>

<Card>
	<Checklist
		label="Pendências para publicar"
		count={(done, total) => `${done} de ${total} prontos`}
		items={[
			{ label: 'Nome e descrição do produto', done: true },
			{ label: 'Preço definido', done: true },
			{
				label: 'Dados bancários',
				done: false,
				href: '/conta/banco',
				reason: 'Sem eles o saque não sai'
			},
			{ label: 'Primeira aula', done: false, href: '/produtos/aulas' }
		]}
	/>
</Card>
