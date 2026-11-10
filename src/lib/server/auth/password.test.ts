import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
	it('verifies the right password and rejects the wrong one', async () => {
		const h = await hashPassword('correct horse');
		expect(h).toMatch(/^\$argon2id\$/);
		expect(await verifyPassword(h, 'correct horse')).toBe(true);
		expect(await verifyPassword(h, 'wrong')).toBe(false);
	});

	it('rejects a malformed hash instead of throwing', async () => {
		expect(await verifyPassword('not-a-hash', 'x')).toBe(false);
	});
});
