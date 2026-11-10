<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { form } = $props();
</script>

<h1>Criar conta</h1>

<form method="post" use:enhance>
	<label>Nome <input name="name" value={form?.name ?? ''} required /></label>
	<label>E-mail <input name="email" type="email" value={form?.email ?? ''} required /></label>
	<label>Senha <input name="password" type="password" minlength="8" required /></label>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	<button>Criar conta</button>
</form>

<p>Já tem conta? <a href={resolve('/(public)/login')}>Entrar</a></p>
