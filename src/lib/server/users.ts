import { eq } from 'drizzle-orm';
import type { Db, Tx } from './db/client';
import { user } from './db/schema';

export interface Account {
	id: string;
	email: string;
	name: string;
	hasPassword: boolean;
}

/**
 * The account for an e-mail, created without a password when it does not exist yet: a
 * buyer at checkout or an invited coproducer (RF-03, RF-04). An existing account keeps its
 * own name. Safe under concurrent calls for the same e-mail.
 */
export async function findOrCreateAccount(
	db: Db | Tx,
	email: string,
	name: string
): Promise<Account> {
	await db.insert(user).values({ email, name }).onConflictDoNothing({ target: user.email });
	const [row] = await db
		.select({ id: user.id, email: user.email, name: user.name, passwordHash: user.passwordHash })
		.from(user)
		.where(eq(user.email, email));
	if (!row) throw new Error('account upsert returned no row');
	return { id: row.id, email: row.email, name: row.name, hasPassword: row.passwordHash !== null };
}
