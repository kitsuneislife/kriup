<script lang="ts">
	import { Grid, Stack, Swatch, Text } from '../index';

	// Apple system colors, Default light and Default dark (R G B). Source of --red ... --gray-6.
	// Order follows meaning: action first, then states, then data categories.
	const colors = [
		['Blue', '--blue', '0 136 255', '0 145 255', 'Acento: link, seleção, ação principal, foco'],
		['Green', '--green', '52 199 89', '48 209 88', 'Liberado, pago, sucesso, ligado'],
		['Orange', '--orange', '255 141 40', '255 146 48', 'Retido, pendente, atenção'],
		['Red', '--red', '255 56 60', '255 66 69', 'Erro, recusado, ação destrutiva'],
		['Indigo', '--indigo', '97 85 245', '109 124 255', 'Reembolso: dinheiro voltando'],
		['Purple', '--purple', '203 48 224', '219 52 242', 'Parceria, coprodução'],
		['Pink', '--pink', '255 45 85', '255 55 95', 'Novidade, destaque de marca'],
		['Yellow', '--yellow', '255 204 0', '255 214 0', 'Estrela, aviso sem urgência'],
		['Cyan', '--cyan', '0 192 232', '60 211 254', 'Informação neutra, dica'],
		['Teal', '--teal', '0 195 208', '0 210 224', 'Só categoria de dados'],
		['Mint', '--mint', '0 200 179', '0 218 195', 'Só categoria de dados'],
		['Brown', '--brown', '172 127 94', '183 138 102', 'Só categoria de dados']
	] as const;

	const grays = [
		['Gray', '--gray', '142 142 147', '142 142 147', 'Ícone inativo, texto de apoio'],
		['Gray 2', '--gray-2', '174 174 178', '99 99 102', 'Borda ao passar o mouse'],
		['Gray 3', '--gray-3', '199 199 204', '72 72 74', 'Borda forte no escuro'],
		['Gray 4', '--gray-4', '209 209 214', '58 58 60', 'Borda no escuro, forte no claro'],
		['Gray 5', '--gray-5', '229 229 234', '44 44 46', 'Borda no claro, elevado no escuro'],
		['Gray 6', '--gray-6', '242 242 247', '28 28 30', 'Fundo no claro, painel no escuro']
	] as const;

	const surfaces = [
		['Fundo do app', '--color-bg-app', 'Nível 0: barra lateral'],
		['Painel', '--color-bg-panel', 'Nível 1: conteúdo'],
		['Elevado', '--color-bg-raised', 'Nível 2: cartão, diálogo'],
		['Campo', '--color-bg-field', 'Entrada de texto']
	] as const;

	const ink = [
		['Texto', '--color-text', 'Conteúdo principal'],
		['Secundário', '--color-text-secondary', 'Apoio, 60%'],
		['Terciário', '--color-text-tertiary', 'Placeholder, 30%'],
		['Preenchimento', '--color-fill', 'Hover, selecionado'],
		['Borda', '--color-border', 'Contorno padrão'],
		['Borda forte', '--color-border-strong', 'Campos']
	] as const;
</script>

<Stack gap={12}>
	<Stack gap={4}>
		<Stack gap={1}>
			<Text variant="subhead" weight="semibold">Cores do sistema</Text>
			<Text variant="footnote" tone="secondary">
				Cada metade mostra o valor em um tema: claro à esquerda, escuro à direita. Uma cor, um
				significado.
			</Text>
		</Stack>
		<Grid min="sm" gap={6}>
			{#each colors as [name, token, light, dark, use] (token)}
				<Swatch {token} {name} {light} {dark} {use} />
			{/each}
		</Grid>
	</Stack>

	<Stack gap={4}>
		<Stack gap={1}>
			<Text variant="subhead" weight="semibold">Cinzas</Text>
			<Text variant="footnote" tone="secondary">
				A estrutura da interface. No escuro a escala se inverte: camada mais alta, cinza mais claro.
			</Text>
		</Stack>
		<Grid min="sm" gap={6}>
			{#each grays as [name, token, light, dark, use] (token)}
				<Swatch {token} {name} {light} {dark} {use} />
			{/each}
		</Grid>
	</Stack>

	<Stack gap={4}>
		<Stack gap={1}>
			<Text variant="subhead" weight="semibold">Superfícies e tinta</Text>
			<Text variant="footnote" tone="secondary">
				Os tokens que os componentes usam. Nenhum componente cita uma cor do sistema direto.
			</Text>
		</Stack>
		<Grid min="sm" gap={6}>
			{#each [...surfaces, ...ink] as [name, token, use] (token)}
				<Swatch {token} {name} {use} size="sm" />
			{/each}
		</Grid>
	</Stack>
</Stack>
