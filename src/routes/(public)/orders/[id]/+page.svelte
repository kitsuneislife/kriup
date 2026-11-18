<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { orderStatusText } from '#lib/order-text';
	import {
		Alert,
		BrandScope,
		Button,
		Card,
		Cluster,
		CopyField,
		Icon,
		type IconName,
		Money,
		Page,
		Spinner,
		Stack,
		StatusBadge,
		Text
	} from '#lib/ui';

	let { data } = $props();

	const salesPage = $derived(resolve('/(public)/p/[id]', { id: data.product.id }));
	const pending = $derived(data.status === 'pending');
	const pix = $derived(pending && data.method === 'pix' ? data.charge?.pix : undefined);
	const badge = $derived(orderStatusText[data.status]);

	const titles: Record<typeof data.status, string> = {
		pending: 'Falta só o pagamento',
		paid: 'Pagamento confirmado',
		expired: 'O Pix expirou',
		declined: 'Pagamento recusado',
		refunded: 'Compra reembolsada'
	};
	const icons: Record<typeof data.status, IconName> = {
		pending: 'clock',
		paid: 'check-circle',
		expired: 'clock',
		declined: 'x-circle',
		refunded: 'refresh'
	};

	// F3: while the payment is pending the page asks again every few seconds; it stops as
	// soon as the status changes or the person leaves
	$effect(() => {
		if (!pending) return;
		const timer = setInterval(() => invalidate('app:order'), 4000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>{titles[data.status]} · {data.product.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<BrandScope color={data.product.brand.color} font={data.product.brand.font}>
	<main>
		<Page width="text">
			<Stack gap={6}>
				<Cluster justify="between" gap={3}>
					<Cluster gap={2}>
						{#if data.product.brand.logoUrl}
							<img class="logo" src={data.product.brand.logoUrl} alt={data.product.name} />
						{/if}
						<Text weight="semibold">{data.product.name}</Text>
					</Cluster>
					<StatusBadge status={badge.status} label={badge.label} />
				</Cluster>

				<Stack gap={3} align="start">
					<span class="seal" data-status={data.status}
						><Icon name={icons[data.status]} size="lg" /></span
					>
					<Text variant="title1" as="h1">{titles[data.status]}</Text>
					<Text tone="secondary">
						{#if data.status === 'paid'}
							Tudo certo com a sua compra. Enviamos o acesso para o seu e-mail; se é a sua primeira
							compra, use o link dele para criar a senha.
						{:else if pix}
							Pague <Money cents={data.grossCents} weight="semibold" /> com Pix. O acesso é liberado assim
							que o pagamento cair.
						{:else if pending}
							Termine o pagamento com cartão na página segura do meio de pagamento.
						{:else if data.status === 'refunded'}
							O valor de <Money cents={data.grossCents} /> foi devolvido e o acesso foi encerrado.
						{:else}
							{data.status === 'expired'
								? 'O prazo para pagar passou e nada foi cobrado.'
								: 'O meio de pagamento não aprovou a compra e nada foi cobrado.'}
							Você pode tentar de novo quando quiser.
						{/if}
					</Text>
				</Stack>

				{#if data.status === 'paid'}
					<Cluster gap={3}>
						<Button
							variant="primary"
							size="lg"
							iconEnd="arrow-right"
							href={resolve('/(app)/student')}
						>
							Ir para meus produtos
						</Button>
						<Button variant="neutral" size="lg" href={resolve('/(app)/student/orders')}>
							Ver meus pedidos
						</Button>
					</Cluster>
				{:else if pix}
					<Card padding="lg">
						<Stack gap={4}>
							{#if pix.qrCodeImage}
								<img
									class="qr"
									src={pix.qrCodeImage}
									alt="QR code do Pix. Se preferir, copie o código abaixo."
								/>
							{/if}
							<CopyField
								label="Pix copia e cola"
								value={pix.payload}
								copyLabel="Copiar código"
								copiedLabel="Código copiado"
							/>
							<Stack gap={2} as="ol">
								<li><Text variant="subhead">1. Abra o app do seu banco e escolha Pix.</Text></li>
								<li><Text variant="subhead">2. Use Pix copia e cola e cole o código.</Text></li>
								<li><Text variant="subhead">3. Confirme. Esta página atualiza sozinha.</Text></li>
							</Stack>
						</Stack>
					</Card>
					<Cluster gap={2} justify="center">
						<Spinner size="sm" label="Esperando o pagamento" />
						<Text variant="footnote" tone="secondary">Esperando o pagamento</Text>
					</Cluster>
				{:else if pending && data.charge}
					<Button
						variant="primary"
						size="lg"
						iconEnd="arrow-up-right"
						href={data.charge.paymentUrl}
					>
						Ir para o pagamento
					</Button>
				{:else if data.status === 'expired' || data.status === 'declined'}
					<Button variant="primary" size="lg" icon="refresh" href={salesPage}>Tentar de novo</Button
					>
				{/if}

				{#if data.simulator && pending}
					<Alert tone="warning" title="Ambiente de desenvolvimento">
						Nenhum banco de verdade está ligado. Use o simulador para aprovar, recusar ou expirar
						este pagamento.
						{#snippet action()}
							<Button size="sm" href={data.simulator ?? undefined}>Abrir simulador</Button>
						{/snippet}
					</Alert>
				{/if}

				<Cluster gap={2} justify="center" wrap={false}>
					<Text tone="secondary"><Icon name="lock" size="sm" /></Text>
					<Text variant="footnote" tone="secondary">
						Guarde o endereço desta página para acompanhar o pedido.
					</Text>
				</Cluster>
			</Stack>
		</Page>
	</main>
</BrandScope>

<style>
	.logo {
		max-block-size: var(--space-8);
		max-inline-size: 8rem;
		object-fit: contain;
	}
	.seal {
		display: inline-grid;
		place-items: center;
		inline-size: var(--space-16);
		block-size: var(--space-16);
		border-radius: var(--radius-pill);
		background: var(--color-accent-tint);
		color: var(--color-accent);
		animation: pop var(--duration-slow) var(--ease-enter) both;
	}
	.seal[data-status='paid'] {
		background: color-mix(in srgb, var(--color-success) 16%, transparent);
		color: var(--color-success);
	}
	.seal[data-status='declined'],
	.seal[data-status='expired'] {
		background: var(--color-fill);
		color: var(--color-text-secondary);
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.seal {
			animation: none;
		}
	}
	.qr {
		align-self: center;
		inline-size: min(16rem, 100%);
		border-radius: var(--radius-md);
		background: var(--white);
	}
</style>
