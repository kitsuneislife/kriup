// Lot 9.3: axe on every page route, in the light and the dark theme. The routes come from
// one story (review-seed.ts) so the detail pages exist. A route added without a line here
// fails the last test, so no screen skips the check.

import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, expectAccessible, test } from './fixtures';
import { seedStory, type Story } from './review-seed';

/** Pages that need no sign-in. */
const publicRoutes = (s: Story): Record<string, string> => ({
	'/(public)/login': '/login',
	'/(public)/register': '/register',
	'/(public)/password/forgot': '/password/forgot',
	'/(public)/password/[token]': `/password/${s.token}`,
	'/(public)/p/[id]': `/p/${s.productId}`,
	'/(public)/p/[id]/checkout': `/p/${s.productId}/checkout?offer=${s.offerId}`,
	'/(public)/orders/[id]': `/orders/${s.pendingOrderId}`,
	'/(public)/dev/payments/[externalId]': `/dev/payments/${s.externalId}`
});

const producerRoutes = (s: Story): Record<string, string> => ({
	'/(app)/producer': '/producer',
	'/(app)/producer/new': '/producer/new',
	'/(app)/producer/products/[id]': `/producer/products/${s.productId}`,
	'/(app)/producer/products/[id]/content': `/producer/products/${s.productId}/content`,
	'/(app)/producer/products/[id]/coproduction': `/producer/products/${s.productId}/coproduction`,
	'/(app)/producer/products/[id]/offers': `/producer/products/${s.productId}/offers`,
	'/(app)/producer/products/[id]/page': `/producer/products/${s.productId}/page`,
	'/(app)/producer/refunds': '/producer/refunds',
	'/(app)/producer/refunds/[id]': `/producer/refunds/${s.refundId}`,
	'/(app)/producer/money': '/producer/money',
	'/(app)/producer/money/payouts': '/producer/money/payouts',
	'/(app)/producer/money/statement': '/producer/money/statement',
	'/(app)/account': '/account'
});

const studentRoutes = (s: Story): Record<string, string> => ({
	'/(app)/student': '/student',
	'/(app)/student/courses/[id]': `/student/courses/${s.productId}`,
	'/(app)/student/orders': '/student/orders',
	'/(app)/student/orders/[id]/refund': `/student/orders/${s.freeOrderId}/refund`,
	'/(app)/student/refunds/[id]': `/student/refunds/${s.refundId}`,
	'/(app)/student/tickets': '/student/tickets',
	'/(app)/student/tickets/new': '/student/tickets/new',
	'/(app)/student/tickets/[id]': `/student/tickets/${s.ticketId}`
});

const coproducerRoutes = (s: Story): Record<string, string> => ({
	'/(app)/coproductions': '/coproductions',
	'/(app)/coproductions/[id]': `/coproductions/${s.coproductionId}`
});

const supportRoutes = (s: Story): Record<string, string> => ({
	'/(app)/support': '/support',
	'/(app)/support/audit': '/support/audit',
	'/(app)/support/blocks': '/support/blocks',
	'/(app)/support/payouts': '/support/payouts',
	'/(app)/support/refunds/[id]': `/support/refunds/${s.refundId}`,
	'/(app)/support/tickets/[id]': `/support/tickets/${s.ticketId}`
});

async function visit(page: import('@playwright/test').Page, routes: Record<string, string>) {
	for (const url of Object.values(routes)) {
		const response = await page.goto(url);
		expect(response?.status(), url).toBe(200);
		await expect(page.locator('html[data-hydrated]'), url).toBeAttached();
		await expect(page.locator('h1').first(), url).toBeVisible();
		try {
			await expectAccessible(page);
		} catch (err) {
			throw new Error(`${url}: ${(err as Error).message}`, { cause: err });
		}
	}
}

test.describe('axe on every route', () => {
	test.slow();

	test('public pages', async ({ page, ctx, createUser }) => {
		test.setTimeout(240_000);
		await visit(page, publicRoutes(await seedStory(ctx, createUser)));
	});

	test('producer screens', async ({ page, ctx, createUser, signIn }) => {
		test.setTimeout(300_000);
		const story = await seedStory(ctx, createUser);
		await signIn(story.producer);
		await visit(page, producerRoutes(story));
	});

	test('student screens', async ({ page, ctx, createUser, signIn }) => {
		test.setTimeout(240_000);
		const story = await seedStory(ctx, createUser);
		await signIn(story.student);
		await visit(page, studentRoutes(story));
	});

	test('coproducer screens', async ({ page, ctx, createUser, signIn }) => {
		const story = await seedStory(ctx, createUser);
		await signIn(story.coproducer);
		await visit(page, coproducerRoutes(story));
	});

	test('support screens', async ({ page, ctx, createUser, signIn }) => {
		test.setTimeout(240_000);
		const story = await seedStory(ctx, createUser);
		await signIn(story.support);
		await visit(page, supportRoutes(story));
	});
});

test('every page route is checked above', async ({ ctx, createUser }) => {
	const root = join(process.cwd(), 'src/routes');
	const found: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) walk(join(dir, entry.name));
			else if (entry.name === '+page.svelte') found.push(relative(root, dir));
		}
	};
	walk(root);
	const story = await seedStory(ctx, createUser);
	const covered = new Set(
		[publicRoutes, producerRoutes, studentRoutes, coproducerRoutes, supportRoutes].flatMap((r) =>
			Object.keys(r(story))
		)
	);
	// the home page only redirects; /design is the development kit page, a 404 in production
	const exempt = ['/', '/design'];
	const routes = found.map((dir) => `/${dir}`).filter((r) => !exempt.includes(r));
	expect(routes.filter((r) => !covered.has(r))).toEqual([]);
});
