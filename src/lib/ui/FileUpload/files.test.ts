import { describe, expect, it } from 'vitest';
import { formatBytes, splitFiles } from './files';

const file = (name: string, type: string, size = 10) =>
	new File([new Uint8Array(size)], name, { type });

describe('splitFiles', () => {
	const png = file('logo.png', 'image/png');
	const pdf = file('contrato.pdf', 'application/pdf');

	it('accepts everything without rules', () => {
		expect(splitFiles([png, pdf], {}).accepted).toHaveLength(2);
	});
	it('matches mime, wildcard and extension', () => {
		expect(splitFiles([png], { accept: ['image/png'] }).accepted).toEqual([png]);
		expect(splitFiles([png], { accept: ['image/*'] }).accepted).toEqual([png]);
		expect(splitFiles([pdf], { accept: ['.pdf'] }).accepted).toEqual([pdf]);
	});
	it('rejects by type and by size', () => {
		const big = file('foto.png', 'image/png', 2000);
		const result = splitFiles([png, pdf, big], { accept: ['image/*'], maxBytes: 1000 });
		expect(result.accepted).toEqual([png]);
		expect(result.rejected.map((item) => item.reason)).toEqual(['type', 'size']);
	});
});

describe('formatBytes', () => {
	it('picks a readable unit', () => {
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(1536)).toBe('1,5 KB');
		expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
	});
});
