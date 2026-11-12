<script lang="ts">
	import { BrandScope, Button, Card, Cluster, Grid, Stack, Text } from '../index';
</script>

<Grid min="md" gap={4}>
	<BrandScope color="#c2410c" font="Lora">
		<Card padding="lg">
			<Stack gap={3}>
				<Text variant="title3">Pão de fermentação natural</Text>
				<Text tone="secondary">A cor e a fonte do produtor valem para tudo aqui dentro.</Text>
				<Cluster><Button variant="primary">Comprar agora</Button></Cluster>
			</Stack>
		</Card>
	</BrandScope>
	<BrandScope color="#ffd60a" font="Montserrat">
		<Card padding="lg">
			<Stack gap={3}>
				<Text variant="title3">Mentoria de vendas</Text>
				<Text tone="secondary">Cor clara: o texto do botão fica escuro.</Text>
				<Cluster><Button variant="primary">Garantir minha vaga</Button></Cluster>
			</Stack>
		</Card>
	</BrandScope>
</Grid>
