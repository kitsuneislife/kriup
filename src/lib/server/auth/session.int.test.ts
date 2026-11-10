import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../db/client';
import { session, user } from '../db/schema';
import { SESSION_TTL_MS, createSession, invalidateSession, validateSession } from './session';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = createDb(url);

let userId: string;

beforeEach(async () => {
	await db.delete(user);
	const [u] = await db
		.insert(user)
		.values({ email: 'a@example.com', name: 'A', passwordHash: 'x' })
		.returning({ id: user.id });
	userId = u!.id;
});

afterAll(async () => {
	await db.delete(user);
});

describe('session', () => {
	it('validates a fresh token and stores only its hash', async () => {
		const { token } = await createSession(db, userId);
		const result = await validateSession(db, token);
		expect(result?.user.email).toBe('a@example.com');
		const rows = await db.select().from(session);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.id).not.toBe(token);
	});

	it('rejects unknown tokens', async () => {
		expect(await validateSession(db, 'nope')).toBeNull();
	});

	it('deletes and rejects expired sessions', async () => {
		const { token } = await createSession(db, userId, new Date(Date.now() - SESSION_TTL_MS - 1000));
		expect(await validateSession(db, token)).toBeNull();
		expect(await db.select().from(session)).toHaveLength(0);
	});

	it('renews a session past half of its lifetime', async () => {
		const { token } = await createSession(db, userId, new Date(Date.now() - SESSION_TTL_MS * 0.6));
		const result = await validateSession(db, token);
		expect(result!.expiresAt.getTime()).toBeGreaterThan(Date.now() + SESSION_TTL_MS * 0.9);
	});

	it('invalidates a session', async () => {
		const { token } = await createSession(db, userId);
		await invalidateSession(db, token);
		expect(await validateSession(db, token)).toBeNull();
	});

	it('removes sessions when the user is deleted', async () => {
		await createSession(db, userId);
		await db.delete(user).where(eq(user.id, userId));
		expect(await db.select().from(session)).toHaveLength(0);
	});

	it('refuses a non-lowercase email', async () => {
		await expect(
			db.insert(user).values({ email: 'A@Example.com', name: 'B', passwordHash: 'x' })
		).rejects.toThrow();
	});
});
