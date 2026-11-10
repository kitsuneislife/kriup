import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/** Creates the e2e database on first use, migrates it and empties it before every run. */
export default async function globalSetup() {
	const url = new URL(process.env.DATABASE_URL!);
	const name = decodeURIComponent(url.pathname.slice(1));
	if (!/^\w+_e2e$/.test(name)) throw new Error(`refusing to reset ${name}: not an e2e database`);

	const server = new URL(url);
	server.pathname = '/postgres';
	const admin = postgres(server.href, { max: 1, onnotice: () => {} });
	const [exists] = await admin`SELECT 1 FROM pg_database WHERE datname = ${name}`;
	if (!exists) await admin.unsafe(`CREATE DATABASE "${name}"`);
	await admin.end();

	const client = postgres(url.href, { max: 1, onnotice: () => {} });
	await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
	await client.end();

	// Imported here, after DATABASE_URL points at the e2e database.
	const { db, resetDb } = await import('../src/lib/server/services/testing');
	await resetDb();
	await db.$client.end();
}
