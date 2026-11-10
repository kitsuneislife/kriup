<script lang="ts">
	import { Card, Cluster, Grid, Stack, Swatch, Text } from '../index';

	// Apple system colors, Default light and Default dark (R G B). Source of --red ... --gray-6.
	const colors = [
		['Red', '--red', '255 56 60', '255 66 69', 'erro, recusado, ação destrutiva'],
		['Orange', '--orange', '255 141 40', '255 146 48', 'retido, pendente, atenção'],
		['Yellow', '--yellow', '255 204 0', '255 214 0', 'destaque, estrela, aviso leve'],
		['Green', '--green', '52 199 89', '48 209 88', 'liberado, pago, sucesso, ligado'],
		['Mint', '--mint', '0 200 179', '0 218 195', 'categoria de dados'],
		['Teal', '--teal', '0 195 208', '0 210 224', 'categoria de dados'],
		['Cyan', '--cyan', '0 192 232', '60 211 254', 'informação neutra'],
		['Blue', '--blue', '0 136 255', '0 145 255', 'acento: link, seleção, ação principal, foco'],
		['Indigo', '--indigo', '97 85 245', '109 124 255', 'reembolso, categoria de dados'],
		['Purple', '--purple', '203 48 224', '219 52 242', 'coprodução, categoria de dados'],
		['Pink', '--pink', '255 45 85', '255 55 95', 'novidade, destaque de marca'],
		['Brown', '--brown', '172 127 94', '183 138 102', 'categoria de dados']
	] as const;

	const grays = [
		['Gray', '--gray', '142 142 147', '142 142 147', 'texto de apoio, ícones inativos'],
		['Gray 2', '--gray-2', '174 174 178', '99 99 102', 'borda ao passar o mouse'],
		['Gray 3', '--gray-3', '199 199 204', '72 72 74', 'borda forte (escuro)'],
		['Gray 4', '--gray-4', '209 209 214', '58 58 60', 'borda (escuro), borda forte (claro)'],
		['Gray 5', '--gray-5', '229 229 234', '44 44 46', 'borda (claro), cartão elevado (escuro)'],
		['Gray 6', '--gray-6', '242 242 247', '28 28 30', 'fundo do app (claro), painel (escuro)']
	] as const;

	const semantic = [
		['Fundo do app', '--color-bg-app'],
		['Painel', '--color-bg-panel'],
		['Elevado', '--color-bg-raised'],
		['Campo', '--color-bg-field'],
		['Preenchimento', '--color-fill'],
		['Borda', '--color-border'],
		['Borda forte', '--color-border-strong'],
		['Texto', '--color-text'],
		['Texto secundário', '--color-text-secondary'],
		['Texto terciário', '--color-text-tertiary']
	] as const;
</script>

{#snippet group(
	title: string,
	rows: readonly (readonly [string, string, string, string, string])[]
)}
	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">{title}</Text>
		<Grid min="lg" gap={3}>
			{#each rows as [name, token, light, dark, use] (token)}
				<Card variant="frame" padding="sm">
					<Stack gap={3}>
						<Cluster justify="between">
							<Text variant="subhead" weight="semibold">{name}</Text>
							<Text variant="caption" tone="secondary" as="code">{token}</Text>
						</Cluster>
						<Cluster gap={4} wrap={false}>
							<Swatch {token} scheme="light" value={`Claro\n${light}`} />
							<Swatch {token} scheme="dark" value={`Escuro\n${dark}`} />
						</Cluster>
						<Text variant="footnote" tone="secondary">{use}</Text>
					</Stack>
				</Card>
			{/each}
		</Grid>
	</Stack>
{/snippet}

<Stack gap={8}>
	{@render group('Cores do sistema (Apple, padrão claro e escuro)', colors)}
	{@render group('Cinzas do sistema', grays)}

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium"
			>Tokens semânticos: o que os componentes usam</Text
		>
		<Grid min="sm" gap={3}>
			{#each semantic as [name, token] (token)}
				<Stack gap={2}>
					<Cluster gap={2} wrap={false}>
						<Swatch {token} scheme="light" />
						<Swatch {token} scheme="dark" />
					</Cluster>
					<Text variant="footnote" weight="medium">{name}</Text>
				</Stack>
			{/each}
		</Grid>
	</Stack>
</Stack>
