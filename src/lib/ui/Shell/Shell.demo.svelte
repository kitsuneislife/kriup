<script lang="ts">
	import { Stack, Text } from '../index';
</script>

<Stack gap={2}>
	<Text>
		A moldura do app: barra lateral sobre o fundo e o conteúdo em um painel arredondado, afastado
		das bordas. A própria página <code>/design</code> usa o Shell; role a página e troque o tema para
		ver.
	</Text>
	<Text variant="footnote" tone="secondary">
		Em tela estreita (até 40rem) a barra lateral passa para cima do conteúdo.
	</Text>
</Stack>
