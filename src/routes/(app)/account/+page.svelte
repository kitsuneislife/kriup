<script lang="ts">
	let { data } = $props();
</script>

<h1>Olá, {data.user.name}</h1>
<p>{data.user.email}</p>

<form method="post" action="?/logout">
	<button>Sair</button>
</form>
