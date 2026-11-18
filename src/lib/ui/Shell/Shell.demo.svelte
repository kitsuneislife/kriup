<script lang="ts">
	import { Icon, Skeleton, Stack, Text } from '../index';
</script>

<Stack gap={6}>
	<!-- A miniature of the frame: brand + sidebar on the app background, content in an inset panel. -->
	<div class="window" aria-hidden="true">
		<div class="side">
			<div class="brand">
				<Icon name="sparkles" size="sm" />
				<Text variant="footnote" weight="semibold" as="span">Marca</Text>
			</div>
			<div class="pills">
				<span class="pill" data-current="true"></span>
				{#each [1, 2, 3] as item (item)}<span class="pill"></span>{/each}
			</div>
		</div>
		<div class="panel">
			<Stack gap={4}>
				<span class="title"></span>
				<Skeleton lines={3} />
				<div class="cards">
					<Skeleton shape="block" size="sm" />
					<Skeleton shape="block" size="sm" />
					<Skeleton shape="block" size="sm" />
				</div>
			</Stack>
		</div>
	</div>
	<Stack gap={1}>
		<Text variant="subhead">
			Barra lateral com espaço opcional para marca (`brand`) sobre o fundo, conteúdo num painel
			arredondado afastado das bordas. Esta página usa o próprio Shell.
		</Text>
		<Text variant="footnote" tone="secondary">
			Só o painel rola. Em tela estreita (até 40rem) a barra lateral vira uma faixa compacta acima
			do conteúdo, mantendo todas as áreas visíveis.
		</Text>
	</Stack>
</Stack>

<style>
	.window {
		display: grid;
		grid-template-columns: var(--width-column-sm) minmax(0, 1fr);
		gap: var(--space-2);
		min-block-size: calc(var(--control-lg) * 6);
		padding: var(--space-2);
		border-radius: var(--radius-lg);
		background: var(--color-bg-app);
		box-shadow:
			0 0 0 var(--border-width) var(--color-border),
			var(--shadow-2);
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-2);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text);
	}
	.brand :global(svg) {
		color: var(--color-accent);
	}
	.pills {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.pill {
		block-size: var(--space-6);
		border-radius: var(--radius-sm);
		background: var(--color-fill-subtle);
	}
	.pill[data-current='true'] {
		background: var(--color-fill-strong);
	}
	.panel {
		overflow: hidden;
		padding: var(--space-6);
		border-radius: var(--radius-md);
		background: var(--color-bg-panel);
		border: var(--border-width) solid var(--color-border);
		box-shadow: inset 0 1px 0 var(--color-highlight);
	}
	.title {
		display: block;
		inline-size: 40%;
		block-size: var(--space-6);
		border-radius: var(--radius-sm);
		background: var(--color-fill-strong);
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
	}
	@media (max-width: 40rem) {
		.window {
			grid-template-columns: minmax(0, 1fr);
		}
		.pills {
			flex-direction: row;
			flex-wrap: wrap;
		}
		.pill {
			inline-size: var(--space-12);
		}
	}
</style>
