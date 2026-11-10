<script lang="ts">
	import type { Component } from 'svelte';

	// Every <Name>.demo.svelte in the kit shows up here automatically.
	const modules = import.meta.glob<{ default: Component }>('../../lib/ui/*/*.demo.svelte', {
		eager: true
	});

	const demos = Object.entries(modules)
		.map(([path, module]) => ({
			name: path.split('/').at(-2) ?? path,
			Demo: module.default
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
</script>

<h1>Design kit</h1>

{#if demos.length === 0}
	<p>Nenhum componente ainda.</p>
{:else}
	<nav aria-label="Componentes">
		<ul>
			{#each demos as { name } (name)}
				<li><a href={`#${name}`}>{name}</a></li>
			{/each}
		</ul>
	</nav>

	{#each demos as { name, Demo } (name)}
		<section id={name}>
			<h2>{name}</h2>
			<Demo />
		</section>
	{/each}
{/if}
