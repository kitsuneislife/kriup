import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const user = pgTable(
	'user',
	{
		id: uuid().primaryKey().defaultRandom(),
		email: text().notNull().unique(),
		name: text().notNull(),
		passwordHash: text().notNull(),
		platformRole: text({ enum: ['user', 'support'] })
			.notNull()
			.default('user'),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(t) => [check('user_email_lowercase', sql`${t.email} = lower(${t.email})`)]
);

/** `id` is the SHA-256 of the cookie token; the raw token is never stored. */
export const session = pgTable('session', {
	id: text().primaryKey(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: timestamp({ withTimezone: true }).notNull()
});
