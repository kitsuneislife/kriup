<script lang="ts">
	import { Button, Cluster, Showcase } from '../index';
</script>

<Showcase
	id="showcase-example"
	title="Exemplo"
	name="Example"
	description="Cada seção desta página é um `Showcase`: título, quando usar e um palco único para as variantes."
	note="Não use em telas do produto: é peça de documentação."
>
	<Cluster gap={3}>
		<Button variant="primary">Primário</Button>
		<Button>Neutro</Button>
	</Cluster>
</Showcase>
