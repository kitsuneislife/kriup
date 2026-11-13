// Lot 9.3 review specs that need the production build: the LCP of the public pages and the
// final screenshots (saved in test-results/captures, never committed). Run with
// `pnpm test:review`, which builds first. Same database and projects as the main suite.

import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const port = Number(process.env.E2E_PORT ?? 4173) + 1000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	...base,
	testIgnore: [],
	testMatch: /review-(lcp|captures)\.spec\.ts/,
	use: { ...base.use, baseURL },
	webServer: {
		command: `pnpm exec vite preview --port ${port} --strictPort`,
		url: baseURL,
		reuseExistingServer: false,
		env: { DATABASE_URL: process.env.DATABASE_URL!, APP_URL: baseURL }
	}
});
