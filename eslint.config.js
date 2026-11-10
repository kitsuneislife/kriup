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
