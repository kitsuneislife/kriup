// Every link in every e-mail the app sends points to a route that exists, on APP_URL's origin.

import { readdirSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { requestPasswordReset } from './auth/password-token';
import { inviteCoproducer } from './services/coproduction';
import { requestRefund } from './services/refunds';
import { buy, days, newUser, publishedProduct, resetDb, testCtx } from './services/testing';

beforeEach(resetDb);

/** One regex per page route under src/routes: `(group)` folders vanish, `[param]` is a segment. */
const routes = readdirSync(new URL('../../routes', import.meta.url), {
	recursive: true,
	withFileTypes: true
})
	.filter((f) => f.isFile() && f.name === '+page.svelte')
	.map((f) => {
		const dir = f.parentPath.split('/routes')[1] ?? '';
		const path = dir.replace(/\/\([^/]+\)/g, '');
		return new RegExp(`^${path.replace(/\[[^/]+\]/g, '[^/]+') || '/'}$`);
	});

function expectLinksToRoutes(ctx: ReturnType<typeof testCtx>, count: number) {
	expect(ctx.mail.sent).toHaveLength(count);
	for (const { text } of ctx.mail.sent) {
		const links = text.match(/https?:\/\/\S+/g) ?? [];
		expect(links.length).toBeGreaterThan(0);
		for (const href of links) {
			const url = new URL(href);
			expect(url.origin, href).toBe(ctx.appUrl);
			expect(
				routes.some((r) => r.test(url.pathname)),
				href
			).toBe(true);
		}
	}
}

describe('e-mail links', () => {
	it('password reset points to an existing route', async () => {
		const ctx = testCtx();
		await newUser('a@example.com');
		await requestPasswordReset(ctx, 'a@example.com');
		expectLinksToRoutes(ctx, 1);
	});

	it('the purchase e-mail does, for a new buyer and a returning one', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		await buy(ctx, offerId, 'new@example.com');
		const returning = await newUser('old@example.com');
		await buy(ctx, offerId, returning.email);
		expectLinksToRoutes(ctx, 2);
	});

	it('the coproduction invite does', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const { productId } = await publishedProduct(ctx, producer.id);
		await inviteCoproducer(ctx, producer.id, {
			productId,
			email: 'co@example.com',
			name: 'Co',
			percentBp: 2_500,
			durationDays: null
		});
		expectLinksToRoutes(ctx, 1);
	});

	it('the out-of-guarantee refund notice to the producer does', async () => {
		const ctx = testCtx();
		const producer = await newUser('p@example.com');
		const student = await newUser('s@example.com');
		const { offerId } = await publishedProduct(ctx, producer.id);
		const now = new Date();
		const orderId = await buy(ctx, offerId, student.email, days(now, -10));
		ctx.mail.sent.length = 0;
		const refundId = await requestRefund(
			ctx,
			student.id,
			{ orderId, reason: 'Não era o que eu esperava.' },
			now
		);
		expectLinksToRoutes(ctx, 1);
		expect(ctx.mail.sent[0]).toMatchObject({ to: producer.email });
		expect(ctx.mail.sent[0]!.text).toContain(`${ctx.appUrl}/producer/refunds/${refundId}`);
	});
});
