import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDb(url: string) {
	return drizzle(postgres(url), { schema, casing: 'snake_case' });
}

export type Db = ReturnType<typeof createDb>;
/** The handle inside `db.transaction`; queries shared by both take `Db | Tx`. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
