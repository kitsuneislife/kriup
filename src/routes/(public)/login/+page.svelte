<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { form } = $props();
</script>

<h1>Entrar</h1>

<form method="post" use:enhance>
	<label>E-mail <input name="email" type="email" value={form?.email ?? ''} required /></label>
	<label>Senha <input name="password" type="password" required /></label>
	{#if form?.error}<p role="alert">{form.error}</p>{/if}
	<button>Entrar</button>
</form>

<p>Ainda não tem conta? <a href={resolve('/(public)/register')}>Cadastre-se</a></p>
