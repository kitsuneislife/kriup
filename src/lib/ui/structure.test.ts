import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const uiDir = import.meta.dirname;
const catalog = readFileSync(join(uiDir, '../../../docs/design/catalogo.md'), 'utf8');
const index = readFileSync(join(uiDir, 'index.ts'), 'utf8');

const components = readdirSync(uiDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);

describe('design kit structure', () => {
	it('uses PascalCase folder names', () => {
		for (const name of components) expect(name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
	});

	it.each(components)('%s has component, demo, export and catalog entry', (name) => {
		expect(existsSync(join(uiDir, name, `${name}.svelte`)), 'component file').toBe(true);
		expect(existsSync(join(uiDir, name, `${name}.demo.svelte`)), 'demo file').toBe(true);
		expect(index, 'export in index.ts').toContain(`./${name}/${name}.svelte`);
		expect(catalog, 'entry in catalogo.md').toContain(`\`${name}\``);
	});
});
