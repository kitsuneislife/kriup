// Navigation: from the home of each profile, every internal link the person can see leads
// to a page that answers, and the pages reached that way show no error screen.

import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { inviteCoproducer } from '../src/lib/server/services/coproduction';
import { requestRefund } from '../src/lib/server/services/refunds';
import { openTicket } from '../src/lib/server/services/support';
import { days } from '../src/lib/server/services/testing';
import { buy, expect, publishedProduct, test } from './fixtures';

const LIMIT = 120;
const SKIP = /^\/(api|design)(\/|$)/;

/** `/student/courses/<uuid>?lesson=…` and its siblings are one screen: crawl one of each. */
const screen = (path: string) => path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id');

/** Follows every same-origin link from `/`, one page per screen. Returns the paths reached. */
async function crawl(page: Page, baseURL: string) {
	const queue = ['/'];
	const seen = new Set<string>();
	const screens = new Set<string>();
	while (queue.length > 0 && seen.size < LIMIT) {
		const target = queue.shift()!;
		const response = await page.goto(target, { waitUntil: 'domcontentloaded' });
		seen.add(new URL(page.url()).pathname);
		expect(response?.status(), `${target} answers`).toBeLessThan(400);
		await expect(page.getByRole('heading', { level: 1 }), `${target} has a title`).not.toHaveText(
			/^(404|500)$|Página não encontrada|Algo deu errado/
		);
		const hrefs = await page
			.locator('a[href]')
			.evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));
		for (const href of hrefs) {
			const url = new URL(href);
			if (url.origin !== baseURL || SKIP.test(url.pathname)) continue;
			const next = screen(url.pathname);
			if (screens.has(next)) continue;
			screens.add(next);
			queue.push(url.pathname + url.search);
		}
	}
	return seen;
}

test('every link a producer sees leads somewhere', async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	test.setTimeout(240_000);
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	const orderId = await buy(ctx, offerId, student.email, days(new Date(), -10));
	await requestRefund(ctx, student.id, { orderId, reason: 'Não era o que eu esperava.' });
	await inviteCoproducer(ctx, producer.id, {
		productId,
		email: `rita.${randomUUID()}@e2e.test`,
		name: 'Rita Souza',
		percentBp: 2_500,
		durationDays: null
	});
	await signIn(producer);
	const seen = await crawl(page, baseURL!);
	for (const path of [
		'/producer',
		'/producer/money',
		'/producer/money/statement',
		'/producer/money/payouts',
		'/producer/refunds',
		`/producer/products/${productId}`,
		`/producer/products/${productId}/page`,
		`/producer/products/${productId}/content`,
		`/producer/products/${productId}/offers`,
		`/producer/products/${productId}/coproduction`,
		`/producer/products/${productId}/preview`,
		`/p/${productId}`,
		'/account'
	]) {
		expect([...seen], path).toContain(path);
	}
	expect([...seen].some((p) => p.startsWith('/producer/refunds/'))).toBe(true);
});

test('every link a student sees leads somewhere', async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	test.setTimeout(240_000);
	const producer = await createUser('Paulo Lima');
	const { productId, offerId } = await publishedProduct(ctx, producer.id);
	const student = await createUser('Bia Rocha');
	const orderId = await buy(ctx, offerId, student.email, days(new Date(), -10));
	await requestRefund(ctx, student.id, { orderId, reason: 'Não era o que eu esperava.' });
	await openTicket(ctx, student.id, { orderId, subject: 'Dúvida', body: 'Preciso de ajuda.' });
	await signIn(student);
	const seen = await crawl(page, baseURL!);
	for (const path of ['/student', '/student/orders', '/student/tickets', '/student/tickets/new']) {
		expect([...seen], path).toContain(path);
	}
	expect([...seen].some((p) => p.startsWith(`/student/courses/${productId}`))).toBe(true);
	expect([...seen].some((p) => p.startsWith('/student/refunds/'))).toBe(true);
	expect([...seen].some((p) => /^\/student\/tickets\/[\w-]{36}$/.test(p))).toBe(true);
});

test('every link a coproducer sees leads somewhere', async ({
	page,
	ctx,
	createUser,
	signIn,
	baseURL
}) => {
	test.setTimeout(240_000);
	const producer = await createUser('Paulo Lima');
	const { productId } = await publishedProduct(ctx, producer.id);
	const co = await createUser('Rita Souza');
	await inviteCoproducer(ctx, producer.id, {
		productId,
		email: co.email,
		name: co.name,
		percentBp: 2_500,
		durationDays: null
	});
	await signIn(co);
	const seen = await crawl(page, baseURL!);
	expect([...seen]).toEqual(
		expect.arrayContaining(['/coproductions', '/producer/money/statement'])
	);
	expect([...seen].some((p) => p.startsWith('/coproductions/'))).toBe(true);
});

test('every link support sees leads somewhere', async ({ page, createUser, signIn, baseURL }) => {
	test.setTimeout(240_000);
	const seen = await crawl(page, baseURL!);
	expect(seen.size).toBeGreaterThan(0); // signed out: only the public pages
	await signIn(await createUser('Sara Dias', 'support'));
	const support = await crawl(page, baseURL!);
	expect([...support]).toEqual(
		expect.arrayContaining([
			'/support',
			'/support/metrics',
			'/support/payouts',
			'/support/blocks',
			'/support/audit'
		])
	);
});
