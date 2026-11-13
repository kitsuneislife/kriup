// Lot 9.3: largest contentful paint of the public pages, measured in the production build
// (`pnpm test:review`). Each page is loaded once to warm the server, then three times; the
// median must stay under the budget. The numbers are printed for the record.

import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { seedStory } from './review-seed';

const BUDGET_MS = 2_500;

async function lcp(page: Page, url: string): Promise<number> {
	await page.goto(url, { waitUntil: 'load' });
	await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
	return page.evaluate(
		() =>
			new Promise<number>((resolve) => {
				const observer = new PerformanceObserver((list) => {
					const entries = list.getEntries();
					resolve(entries[entries.length - 1]!.startTime);
					observer.disconnect();
				});
				observer.observe({ type: 'largest-contentful-paint', buffered: true });
				// a page that painted nothing never reports
				setTimeout(() => resolve(Number.POSITIVE_INFINITY), 5_000);
			})
	);
}

test('the public pages paint their largest content within the budget', async ({
	page,
	ctx,
	createUser
}, info) => {
	test.slow();
	const story = await seedStory(ctx, createUser);
	const pages = {
		'/login': '/login',
		'/register': '/register',
		'/p/[id]': `/p/${story.productId}`,
		'/p/[id]/checkout': `/p/${story.productId}/checkout?offer=${story.offerId}`
	};
	const report: Record<string, number> = {};
	for (const [name, url] of Object.entries(pages)) {
		await lcp(page, url); // warm-up
		const runs: number[] = [];
		for (let i = 0; i < 3; i++) runs.push(await lcp(page, url));
		report[name] = Math.round(runs.sort((a, b) => a - b)[1]!);
	}
	console.log(`LCP (ms, median of 3) ${info.project.name}: ${JSON.stringify(report)}`);
	for (const [name, ms] of Object.entries(report)) {
		expect(ms, `LCP of ${name}`).toBeLessThan(BUDGET_MS);
	}
});
