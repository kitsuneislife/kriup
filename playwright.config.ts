import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// The suite has its own database next to the dev one (`app` becomes `app_e2e`), so a run
// never touches dev data. Workers load this file again: the suffix is added only once.
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const database = new URL(process.env.DATABASE_URL);
if (!database.pathname.endsWith('_e2e')) database.pathname += '_e2e';
process.env.DATABASE_URL = database.href;

// E2E_PORT lets several checkouts run the suite at once, each against its own dev server.
const port = Number(process.env.E2E_PORT ?? 4173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: 'e2e',
	// the review specs need the production build: `pnpm test:review` (playwright.review.config.ts)
	testIgnore: /review-(lcp|captures)\.spec\.ts/,
	globalSetup: './e2e/global-setup.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: { baseURL, trace: 'retain-on-failure' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		// RNF-08: every screen is checked at 375 px too
		{ name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } }
	],
	// The dev server, not a build: the payment simulator (/api/dev/payments) exists only in dev.
	webServer: {
		command: `pnpm exec vite dev --port ${port} --strictPort`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		env: { DATABASE_URL: database.href, APP_URL: baseURL }
	}
});
