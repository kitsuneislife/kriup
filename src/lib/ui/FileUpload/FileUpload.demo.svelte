<script lang="ts">
	import { FileUpload, Grid } from '../index';

	let logo = $state<File[]>([]);
	let logoError = $state<string>();
	let attachments = $state<File[]>([]);
</script>

<Grid min="lg" gap={6}>
	<FileUpload
		label="Arraste o logo ou escolha um arquivo"
		hint="PNG ou JPG, até 2 MB"
		accept={['image/png', 'image/jpeg']}
		maxBytes={2 * 1024 * 1024}
		bind:files={logo}
		error={logoError}
		onreject={(rejected) =>
			(logoError = `${rejected[0]?.file.name} não serve: use PNG ou JPG de até 2 MB.`)}
		removeLabel={(name) => `Remover ${name}`}
	/>
	<FileUpload
		label="Anexe comprovantes"
		hint="Vários arquivos, até 5 MB cada"
		multiple
		maxBytes={5 * 1024 * 1024}
		bind:files={attachments}
		removeLabel={(name) => `Remover ${name}`}
	/>
</Grid>
