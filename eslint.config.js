import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	{ ignores: ['.svelte-kit/', 'build/', 'drizzle/', 'node_modules/', 'docs/'] },
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: { parserOptions: { parser: ts.parser } }
	},
	{
		// screens use the design kit: no raw controls, no kit internals (docs/design/regras.md R1, R2)
		files: ['src/routes/**/*.svelte'],
		rules: {
			'svelte/no-restricted-html-elements': [
				'error',
				...['button', 'input', 'select', 'textarea', 'dialog', 'table'].map((element) => ({
					elements: [element],
					message: 'Use the component from #lib/ui (docs/design/regras.md R1).'
				}))
			],
			'no-restricted-imports': [
				'error',
				{ patterns: [{ group: ['\\#lib/ui/*'], message: "Import from '#lib/ui' only (R2)." }] }
			]
		}
	},
	{
		// legacy screens written before the kit: only shrinks, remove each one when migrated
		files: [
			'src/routes/(public)/login/+page.svelte',
			'src/routes/(public)/register/+page.svelte',
			'src/routes/account/+page.svelte'
		],
		rules: { 'svelte/no-restricted-html-elements': 'off' }
	},
	{
		// the kit is self-contained: no routes, server, domain or framework runtime
		files: ['src/lib/ui/**'],
		ignores: ['src/lib/ui/**/*.test.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						'$app/*',
						'\\#lib/server/*',
						'\\#lib/domain/*',
						'@sveltejs/kit*',
						'**/routes/*'
					]
				}
			]
		}
	},
	{
		// domain is pure: no framework, no database, no server code
		files: ['src/lib/domain/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						'$app/*',
						'$env/*',
						'\\#lib/server/*',
						'\\#lib/ui',
						'\\#lib/ui/*',
						'@sveltejs/*',
						'drizzle-orm*',
						'postgres',
						'../server/*'
					]
				}
			]
		}
	}
);
