// Every e2e spec imports `test` and `expect` from here. Data is created through the same
// services the app uses (src/lib/server/services/testing.ts), on the e2e database.

import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';
import { SESSION_COOKIE, createSession, type SessionUser } from '../src/lib/server/auth/session';
import { db, newUser, testCtx, type TestCtx } from '../src/lib/server/services/testing';

export { buy, publishedProduct } from '../src/lib/server/services/testing';
export { expect };

type Fixtures = {
	/** Service context on the e2e database, to create data the way the app does. */
	ctx: TestCtx;
	/**
	 * A new account. Each e-mail is unique, so specs run in parallel on one database and
	 * never need a reset between them.
	 */
	createUser: (name: string, role?: 'user' | 'support') => Promise<SessionUser>;
	/** Signs the browser in as `user` with a session cookie, skipping the login screen. */
	signIn: (user: SessionUser) => Promise<void>;
};

export const test = base.extend<Fixtures>({
	// eslint-disable-next-line no-empty-pattern -- Playwright reads the fixture's dependencies from this pattern
	ctx: async ({}, use) => {
		await use(testCtx());
	},
	// eslint-disable-next-line no-empty-pattern -- see ctx
	createUser: async ({}, use) => {
		await use((name, role) =>
			newUser(`${name.toLowerCase().replace(/\W+/g, '.')}.${randomUUID()}@e2e.test`, role, name)
		);
	},
	signIn: async ({ context, baseURL }, use) => {
		await use(async (user) => {
			const { token, expiresAt } = await createSession(db, user.id);
			await context.addCookies([
				{
					name: SESSION_COOKIE,
					value: token,
					url: baseURL!,
					httpOnly: true,
					sameSite: 'Lax',
					expires: expiresAt.getTime() / 1000
				}
			]);
		});
	}
});

/** Fails with the axe violations of the current page, in the light and the dark theme. */
export async function expectAccessible(page: Page) {
	for (const colorScheme of ['light', 'dark'] as const) {
		await page.emulateMedia({ colorScheme });
		// hidden content (a closed Disclosure) never runs its theme transitions, and a spinner
		// never ends: skip both
		await page.evaluate(() =>
			Promise.all(
				document
					.getAnimations()
					.filter((a) => (a.effect as KeyframeEffect | null)?.target?.checkVisibility() ?? true)
					.filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
					.map((a) => a.finished)
			)
		);
		const { violations } = await new AxeBuilder({ page }).analyze();
		expect(
			violations.map((v) => `${v.id}: ${v.help} at ${v.nodes.map((n) => n.target).join(', ')}`),
			`axe, ${colorScheme} theme`
		).toEqual([]);
	}
	await page.emulateMedia({ colorScheme: null });
}
