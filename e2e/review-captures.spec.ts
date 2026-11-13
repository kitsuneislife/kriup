// Lot 9.3: the final screenshots of the main screens, at desktop width and at 375 px (the
// two projects), saved in test-results/captures/<project>/. They are for looking at, never
// committed (test-results is ignored). Run with `pnpm test:review`.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { seedStory } from './review-seed';

test('captures the main screens', async ({ page, ctx, createUser, signIn }, info) => {
	test.setTimeout(300_000);
	const dir = join('test-results', 'captures', info.project.name);
	mkdirSync(dir, { recursive: true });
	const story = await seedStory(ctx, createUser);
	const p = `/producer/products/${story.productId}`;

	async function capture(name: string, url: string) {
		const response = await page.goto(url);
		expect(response?.status(), url).toBe(200);
		await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
		await settle(page);
		await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
	}

	for (const [name, url] of [
		['login', '/login'],
		['register', '/register'],
		['sales-page', `/p/${story.productId}`],
		['checkout', `/p/${story.productId}/checkout?offer=${story.offerId}`],
		['order', `/orders/${story.pendingOrderId}`]
	] as const) {
		await capture(`public-${name}`, url);
	}

	await signIn(story.producer);
	for (const [name, url] of [
		['products', '/producer'],
		['new', '/producer/new'],
		['editor', p],
		['content', `${p}/content`],
		['offers', `${p}/offers`],
		['page', `${p}/page`],
		['coproduction', `${p}/coproduction`],
		['refunds', '/producer/refunds'],
		['refund', `/producer/refunds/${story.refundId}`],
		['money', '/producer/money'],
		['payouts', '/producer/money/payouts'],
		['statement', '/producer/money/statement'],
		['account', '/account']
	] as const) {
		await capture(`producer-${name}`, url);
	}

	await signIn(story.student);
	for (const [name, url] of [
		['home', '/student'],
		['course', `/student/courses/${story.productId}`],
		['orders', '/student/orders'],
		['refund-new', `/student/orders/${story.freeOrderId}/refund`],
		['refund', `/student/refunds/${story.refundId}`],
		['tickets', '/student/tickets'],
		['ticket', `/student/tickets/${story.ticketId}`]
	] as const) {
		await capture(`student-${name}`, url);
	}

	await signIn(story.coproducer);
	await capture('coproducer-list', '/coproductions');
	await capture('coproducer-contract', `/coproductions/${story.coproductionId}`);

	await signIn(story.support);
	for (const [name, url] of [
		['queue', '/support'],
		['refund', `/support/refunds/${story.refundId}`],
		['ticket', `/support/tickets/${story.ticketId}`],
		['blocks', '/support/blocks'],
		['audit', '/support/audit'],
		['payouts', '/support/payouts']
	] as const) {
		await capture(`support-${name}`, url);
	}
});

/** Lets the entrance animations and the font load end, so the capture is of the final state. */
async function settle(page: Page) {
	await page.evaluate(() => document.fonts.ready);
	await page.evaluate(() =>
		Promise.all(
			document
				.getAnimations()
				.filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
				.map((a) => a.finished)
		)
	);
}
