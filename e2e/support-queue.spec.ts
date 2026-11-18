// UC-06: the support queue, the decision on an escalated or contested refund that the
// student and the producer then read, a ticket answered and closed, and the 404 to
// everyone who is not support.

import { randomUUID } from 'node:crypto';
import type { SessionUser } from '../src/lib/server/auth/session';
import type { Ctx } from '../src/lib/server/context';
import { requestPayout } from '../src/lib/server/services/money';
import {
	contestRefund,
	escalateOverdueRefunds,
	getRefund,
	producerDecision,
	requestRefund
} from '../src/lib/server/services/refunds';
import { openTicket } from '../src/lib/server/services/support';
import { days, releaseSalesOf } from '../src/lib/server/services/testing';
import { buy, expect, expectAccessible, hydrated, publishedProduct, test } from './fixtures';

/**
 * The queue is shared by every spec running at the same time, so each test names its
 * people with a tag of its own and looks only at its own items.
 */
const tagged = (name: string) => `${name} ${randomUUID().slice(0, 6)}`;

type People = { producer: SessionUser; student: SessionUser; offerId: string };

async function people(
	ctx: Ctx,
	createUser: (name: string) => Promise<SessionUser>
): Promise<People> {
	const producer = await createUser(tagged('Paulo Lima'));
	const { offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser(tagged('Lia Fontes'));
	return { producer, student, offerId };
}

/**
 * A request the producer let expire, moved to support by the daily job. It is opened five
 * days ago, and the job runs at its deadline, two days ago: so it never escalates the
 * requests other specs leave with the producer past a later deadline. Support then has
 * until tomorrow.
 */
async function escalated(ctx: Ctx, { offerId, student }: People, reason: string) {
	const openedAt = days(new Date(), -5);
	const orderId = await buy(ctx, offerId, student.email, days(openedAt, -10));
	const id = await requestRefund(ctx, student.id, { orderId, reason }, openedAt);
	const { refund } = await getRefund(ctx, student, id);
	await escalateOverdueRefunds(ctx, refund.dueAt);
	return id;
}

/** A request the producer declined and the student contested, straight to support. */
async function contested(ctx: Ctx, { offerId, student, producer }: People, reason: string) {
	const orderId = await buy(ctx, offerId, student.email, days(new Date(), -10));
	const id = await requestRefund(ctx, student.id, { orderId, reason });
	await producerDecision(ctx, producer.id, id, {
		decision: 'decline',
		reason: 'O conteúdo foi entregue como anunciado.'
	});
	await contestRefund(ctx, student.id, id);
	return id;
}

test('an escalated refund is declined with a justification the student and producer read', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow(); // three people, five screens and their axe checks
	const cast = await people(ctx, createUser);
	const refundId = await escalated(ctx, cast, 'O curso não abre no meu celular.');
	await signIn(await createUser('Sara Dias', 'support'));

	await page.goto('/support');
	const item = page.getByRole('listitem').filter({ hasText: cast.student.name });
	await expect(item.getByText('Prazo do produtor vencido')).toBeVisible();
	await expect(item.getByText('O curso não abre no meu celular.')).toBeVisible();
	await expect(item.getByText(/Falta/)).toBeVisible();
	await expectAccessible(page);

	await item.getByRole('link', { name: `Decidir reembolso de ${cast.student.name}` }).click();
	await expect(
		page.getByRole('heading', { name: 'O produtor não respondeu no prazo', level: 1 })
	).toBeVisible();
	await hydrated(page);
	await expect(page.getByText('O prazo do produtor passou')).toBeVisible();
	await expectAccessible(page);

	// blank is refused on the field, and nothing changes
	const justification = page.getByLabel('Justificativa da recusa');
	await justification.fill('   ');
	await page.getByRole('button', { name: 'Recusar reembolso' }).click();
	await expect(page.getByText('Preencha este campo.')).toBeVisible();
	await expect(justification).toHaveAttribute('aria-invalid', 'true');
	await expect(
		page.getByRole('heading', { name: 'O produtor não respondeu no prazo' })
	).toBeVisible();

	await page.getByLabel('Sua mensagem').fill('Testamos em dois celulares e o curso abriu.');
	await page.getByRole('button', { name: 'Enviar' }).click();
	await expect(page.getByText('Testamos em dois celulares e o curso abriu.')).toBeVisible();

	await justification.fill('O curso abre no celular; o acesso foi testado pela equipe.');
	await page.getByRole('button', { name: 'Recusar reembolso' }).click();
	await expect(
		page.getByRole('heading', { name: 'A plataforma recusou o pedido', level: 1 })
	).toBeVisible();
	await expect(page.getByText('Recusa registrada')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Recusar reembolso' })).toHaveCount(0);
	await expectAccessible(page);

	await page.getByRole('link', { name: 'Voltar para a fila' }).click();
	await expect(page.getByRole('heading', { name: 'Fila do suporte' })).toBeVisible();
	await expect(page.getByRole('listitem').filter({ hasText: cast.student.name })).toHaveCount(0);

	const justified = 'O curso abre no celular; o acesso foi testado pela equipe.';
	await page.context().clearCookies();
	await signIn(cast.student);
	await page.goto(`/student/refunds/${refundId}`);
	await expect(page.getByRole('heading', { name: 'A plataforma recusou o pedido' })).toBeVisible();
	await expect(page.getByText(justified)).toBeVisible();
	await expect(page.getByText('Testamos em dois celulares e o curso abriu.')).toBeVisible();

	await page.context().clearCookies();
	await signIn(cast.producer);
	await page.goto(`/producer/refunds/${refundId}`);
	await expect(page.getByRole('heading', { name: 'A plataforma recusou o pedido' })).toBeVisible();
	await expect(page.getByText(justified)).toBeVisible();
});

test('a contested refund is approved: money back, access ended, sale reversed', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const cast = await people(ctx, createUser);
	const refundId = await contested(ctx, cast, 'Não era o que foi prometido.');
	await signIn(await createUser('Sara Dias', 'support'));

	await page.goto('/support');
	const item = page.getByRole('listitem').filter({ hasText: cast.student.name });
	await expect(item.getByText('Contestado pelo aluno')).toBeVisible();
	await item.getByRole('link', { name: `Decidir reembolso de ${cast.student.name}` }).click();
	await expect(
		page.getByRole('heading', { name: 'O aluno contestou a recusa', level: 1 })
	).toBeVisible();
	await expect(page.getByText('O conteúdo foi entregue como anunciado.')).toBeVisible();
	await hydrated(page);

	await page.getByRole('button', { name: 'Aprovar reembolso' }).click();
	const dialog = page.getByRole('dialog', { name: 'Aprovar reembolso?' });
	await expect(
		dialog.getByText('A decisão da plataforma é final e não pode ser desfeita.')
	).toBeVisible();
	await expectAccessible(page);
	await dialog.getByRole('button', { name: 'Aprovar e devolver' }).click();
	await expect(page.getByRole('heading', { name: 'Reembolso concluído', level: 1 })).toBeVisible();
	await expect(dialog).toBeHidden();
	await expect(page.getByRole('button', { name: 'Aprovar reembolso' })).toHaveCount(0);
	await expectAccessible(page);

	await page.context().clearCookies();
	await signIn(cast.student);
	await page.goto(`/student/refunds/${refundId}`);
	await expect(page.getByRole('heading', { name: 'Reembolso concluído' })).toBeVisible();
	await page.goto('/student/orders');
	await expect(page.getByText('Acesso encerrado')).toBeVisible();

	await page.context().clearCookies();
	await signIn(cast.producer);
	await page.goto(`/producer/refunds/${refundId}`);
	await expect(page.getByRole('heading', { name: 'Reembolso concluído', level: 1 })).toBeVisible();
	await page.getByRole('link', { name: 'Ver no extrato' }).click();
	await expect(page.getByRole('region', { name: 'Extrato' }).getByText('Estornado')).toBeVisible();
});

test('support answers a ticket and closes it, and the student reads both', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const cast = await people(ctx, createUser);
	const orderId = await buy(ctx, cast.offerId, cast.student.email);
	const subject = tagged('Certificado');
	const ticketId = await openTicket(ctx, cast.student.id, {
		orderId,
		subject,
		body: 'Onde fica o certificado?'
	});
	await signIn(await createUser('Sara Dias', 'support'));

	await page.goto('/support');
	const item = page.getByRole('listitem').filter({ hasText: subject });
	await expect(item.getByText(cast.student.name)).toBeVisible();
	await item.getByRole('link', { name: `Responder chamado de ${cast.student.name}` }).click();
	await expect(page.getByRole('heading', { name: subject, level: 1 })).toBeVisible();
	await expect(page.getByText('Onde fica o certificado?')).toBeVisible();
	await hydrated(page);
	await expectAccessible(page);

	// a blank answer is refused on the field
	await page.getByRole('button', { name: 'Enviar resposta' }).click();
	await expect(page.getByText('Preencha este campo.')).toBeVisible();

	await page.getByLabel('Sua resposta').fill('Fica no último módulo, depois da última aula.');
	await page.getByRole('button', { name: 'Enviar resposta' }).click();
	await expect(page.getByText('Fica no último módulo, depois da última aula.')).toBeVisible();
	await expect(page.getByLabel('Sua resposta')).toBeEmpty();

	await page.getByRole('button', { name: 'Encerrar chamado' }).click();
	await expect(page.getByText('Chamado encerrado')).toBeVisible();
	await expect(page.getByText(/Este chamado está fechado/)).toBeVisible();
	await expect(page.getByLabel('Sua resposta')).toHaveCount(0);
	await expectAccessible(page);

	await page.goto('/support');
	await expect(page.getByRole('listitem').filter({ hasText: subject })).toHaveCount(0);

	await page.context().clearCookies();
	await signIn(cast.student);
	await page.goto(`/student/tickets/${ticketId}`);
	await expect(page.getByText('Fica no último módulo, depois da última aula.')).toBeVisible();
	await expect(page.getByText('Este chamado está fechado')).toBeVisible();
});

test('anyone but support gets 404 on the support screens and actions', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	const cast = await people(ctx, createUser);
	const refundId = await contested(ctx, cast, 'Não gostei.');
	const ticketId = await openTicket(ctx, cast.student.id, {
		orderId: await buy(ctx, cast.offerId, cast.student.email),
		subject: 'Dúvida',
		body: 'Oi'
	});

	for (const person of [cast.student, cast.producer]) {
		await page.context().clearCookies();
		await signIn(person);
		for (const path of [
			'/support',
			'/support/metrics',
			`/support/refunds/${refundId}`,
			`/support/tickets/${ticketId}`
		]) {
			const response = await page.goto(path);
			expect(response?.status(), path).toBe(404);
		}
		// a form posted straight to an action is refused too
		const origin = new URL(page.url()).origin;
		for (const action of [
			`/support/refunds/${refundId}?/approve`,
			`/support/tickets/${ticketId}?/close`
		]) {
			const post = await page.request.post(action, { form: {}, headers: { origin } });
			expect(post.status(), action).toBe(404);
		}
	}

	// support gets 404 for a missing or malformed id
	await page.context().clearCookies();
	await signIn(await createUser('Sara Dias', 'support'));
	for (const path of [
		`/support/refunds/${randomUUID()}`,
		'/support/refunds/not-a-uuid',
		`/support/tickets/${randomUUID()}`,
		'/support/tickets/not-a-uuid'
	]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(404);
	}
	// nothing was decided or closed
	await page.goto(`/support/refunds/${refundId}`);
	await expect(page.getByRole('heading', { name: 'O aluno contestou a recusa' })).toBeVisible();
	await page.goto(`/support/tickets/${ticketId}`);
	await expect(page.getByRole('button', { name: 'Encerrar chamado' })).toBeVisible();
});

test('shows pending payouts alert on the queue and renders Lean Canvas metrics dashboard', async ({
	page,
	ctx,
	createUser,
	signIn
}) => {
	test.slow();
	const producer = await createUser(tagged('Paulo Lima'));
	const { offerId } = await publishedProduct(ctx, producer.id, 15_000, tagged('Curso de pão'));
	const student = await createUser(tagged('Lia Fontes'));
	const orderId = await buy(ctx, offerId, student.email);
	await openTicket(ctx, student.id, {
		orderId,
		subject: tagged('Acesso às aulas'),
		body: 'Preciso de ajuda com o vídeo.'
	});
	await releaseSalesOf(producer.id);
	await requestPayout(ctx, producer.id, 6_000);

	await signIn(await createUser('Sara Dias', 'support'));
	await page.goto('/support');
	await expect(page.getByText(/\d+ saques? aguardando revisão/)).toBeVisible();
	const reviewLink = page.getByRole('link', { name: 'Revisar saques' });
	await expect(reviewLink).toBeVisible();
	await expectAccessible(page);

	await reviewLink.click();
	await expect(page.getByRole('heading', { name: 'Saques', level: 1 })).toBeVisible();

	await page.goto('/support/metrics');
	await expect(
		page.getByRole('heading', { name: 'Métricas da plataforma', level: 1 })
	).toBeVisible();
	await expect(page.getByText('Tempo até publicar')).toBeVisible();
	await expect(page.getByText('Taxa de publicação')).toBeVisible();
	await expect(page.getByText('Primeira resposta em reembolso')).toBeVisible();
	await expect(page.getByText('Total de chamados')).toBeVisible();
	await expect(page.getByText('Volume pago')).toBeVisible();
	await expect(page.getByText('Receita de taxa da plataforma')).toBeVisible();
	await expect(page.getByRole('img', { name: 'Pedidos pagos nos últimos 7 dias' })).toBeVisible();

	const table = page.getByRole('table', { name: 'Chamados por produtor' });
	await expect(table.getByText(producer.name)).toBeVisible();
	await expect(table.getByText(producer.email)).toBeVisible();
	await expectAccessible(page);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('the approval is confirmed on the page', async ({ page, ctx, createUser, signIn }) => {
		const cast = await people(ctx, createUser);
		const refundId = await contested(ctx, cast, 'Não era o prometido.');
		await signIn(await createUser('Sara Dias', 'support'));

		await page.goto(`/support/refunds/${refundId}`);
		await page.getByRole('link', { name: 'Aprovar reembolso' }).click();
		await expect(page.getByRole('heading', { name: 'Confirmar aprovação' })).toBeVisible();
		await page.getByRole('button', { name: 'Aprovar e devolver' }).click();
		await expect(
			page.getByRole('heading', { name: 'Reembolso concluído', level: 1 })
		).toBeVisible();
	});
});
