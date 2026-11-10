<script lang="ts">
	import { Grid, Stack, Text, TextField } from '../index';

	let email = $state('maria@exemplo.com');
	let search = $state('');
</script>

<Stack gap={8}>
	<Grid min="md" gap={6}>
		<TextField label="Nome" placeholder="Como aparece no certificado" />
		<TextField
			label="E-mail"
			type="email"
			icon="mail"
			bind:value={email}
			hint="Enviamos o recibo para este endereço."
		/>
		<TextField label="Senha" type="password" icon="lock" value="segredo123" />
		<TextField
			label="Buscar"
			type="search"
			icon="search"
			placeholder="Buscar produtos..."
			bind:value={search}
		/>
		<TextField label="CPF" value="123.456" error="CPF incompleto. Faltam 5 dígitos." />
		<TextField label="Desabilitado" value="Não editável" disabled />
	</Grid>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Tamanhos (32, 40, 48)</Text>
		<TextField label="Pequeno" size="sm" placeholder="sm" />
		<TextField label="Médio" size="md" placeholder="md" />
		<TextField label="Grande" size="lg" placeholder="lg" />
	</Stack>

	<Stack gap={3}>
		<Text variant="footnote" tone="secondary" weight="medium">Várias linhas</Text>
		<TextField
			label="Descrição"
			rows={3}
			placeholder="Conte do que se trata o produto"
			hint="Cresce com o texto."
		/>
	</Stack>
</Stack>
