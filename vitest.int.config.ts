import { defineConfig } from 'vitest/config';

// Integration tests hit a real Postgres (DATABASE_URL). Not part of `pnpm test`.
export default defineConfig({
	test: {
		include: ['src/**/*.int.test.ts'],
		fileParallelism: false
	}
});
