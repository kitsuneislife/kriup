// The MVP data model. docs/tecnico/modelo-de-dados.md explains every table and rule;
// keep both in the same commit. Invariants live here as constraints; the ones that span
// rows (ledger immutability, coproduction share limit) are triggers in drizzle/0002.

import { type SQL, sql } from 'drizzle-orm';
import {
	type AnyPgColumn,
	boolean,
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { GUARANTEE_DAYS, OFFER_MIN_PRICE_CENTS } from '../../domain/params';
import { REFUND_OWNERS } from '../../domain/refund';
import {
	COPRODUCTION_TRANSITIONS,
	ENROLLMENT_TRANSITIONS,
	ENTRY_TRANSITIONS,
	ORDER_TRANSITIONS,
	PAYOUT_TRANSITIONS,
	PRODUCT_TRANSITIONS,
	REFUND_TRANSITIONS,
	statesOf,
	TICKET_TRANSITIONS
} from '../../domain/states';

// ---------------------------------------------------------------------------
// Enums. State enums come from the machines in domain/states.ts.

export const platformRole = pgEnum('platform_role', ['user', 'support']);
export const productType = pgEnum('product_type', ['course', 'mentorship', 'subscription']);
export const productStatus = pgEnum('product_status', statesOf(PRODUCT_TRANSITIONS));
export const pageType = pgEnum('page_type', ['sales', 'checkout', 'access_email']);
export const recurrence = pgEnum('recurrence', ['one_time', 'monthly']);
export const paymentMethod = pgEnum('payment_method', ['pix', 'card']);
export const orderStatus = pgEnum('order_status', statesOf(ORDER_TRANSITIONS));
export const enrollmentStatus = pgEnum('enrollment_status', statesOf(ENROLLMENT_TRANSITIONS));
export const coproductionStatus = pgEnum('coproduction_status', statesOf(COPRODUCTION_TRANSITIONS));
export const entryType = pgEnum('entry_type', [
	'sale',
	'reversal',
	'payout',
	'payout_fee',
	'adjustment'
]);
export const entryState = pgEnum('entry_state', statesOf(ENTRY_TRANSITIONS));
export const payoutStatus = pgEnum('payout_status', statesOf(PAYOUT_TRANSITIONS));
export const refundStatus = pgEnum('refund_status', statesOf(REFUND_TRANSITIONS));
export const refundOwner = pgEnum('refund_owner', REFUND_OWNERS);
export const ticketStatus = pgEnum('ticket_status', statesOf(TICKET_TRANSITIONS));
export const blockTarget = pgEnum('block_target', ['balance', 'product', 'account']);

export type PageType = (typeof pageType.enumValues)[number];

// ---------------------------------------------------------------------------
// JSON shapes. Validated with Zod where they come in; the database only stores them.

/** RF-12: applied to every generated page. */
export interface Brand {
	logoUrl: string | null;
	/** `#rrggbb` */
	color: string;
	font: string;
}

/** RF-13: the editor changes section order, texts and image URLs, nothing else. */
export interface PageSection {
	kind: string;
	fields: Record<string, string>;
}

export interface PageContent {
	sections: PageSection[];
}

/** RF-11: everything a template drafts for a new product. */
export interface TemplateStructure {
	pages: Record<PageType, PageContent>;
	refundPolicy: string;
	modules: { title: string; lessons: { title: string }[] }[];
}

// ---------------------------------------------------------------------------
// Helpers

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const at = () => timestamp({ withTimezone: true });
const notBlank = (column: AnyPgColumn) => sql`btrim(${column}) <> ''`;
/** `column` is set exactly when `condition` holds. */
const setWhen = (column: AnyPgColumn, condition: SQL) =>
	sql`(${column} IS NOT NULL) = (${condition})`;

// ---------------------------------------------------------------------------
// Account and access (RF-01 to RF-04)

/**
 * One account can be producer, student and coproducer (RF-04): those are roles on a
 * product, not account types. `passwordHash` is null for a student created at checkout
 * until they set a password (RF-03).
 */
export const user = pgTable(
	'user',
	{
		id: uuid().primaryKey().defaultRandom(),
		email: text().notNull().unique(),
		name: text().notNull(),
		passwordHash: text(),
		platformRole: platformRole().notNull().default('user'),
		createdAt: createdAt()
	},
	(t) => [
		check('user_email_lowercase', sql`${t.email} = lower(${t.email})`),
		check('user_name_not_blank', notBlank(t.name))
	]
);

/** `id` is the SHA-256 of the cookie token; the raw token is never stored. */
export const session = pgTable(
	'session',
	{
		id: text().primaryKey(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: at().notNull()
	},
	(t) => [index('session_user_id_idx').on(t.userId)]
);

/**
 * A single-use link to set a password: first access after checkout (RF-03) or recovery
 * (RF-02). `id` is the SHA-256 of the token, like a session; the row is deleted on use.
 */
export const passwordToken = pgTable(
	'password_token',
	{
		id: text().primaryKey(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: at().notNull(),
		createdAt: createdAt()
	},
	(t) => [index('password_token_user_id_idx').on(t.userId)]
);

// ---------------------------------------------------------------------------
// Guided creation (RF-10 to RF-15)

/** A starting point for the wizard (RF-10, RF-11). `slug` keeps seeds idempotent. */
export const template = pgTable(
	'template',
	{
		id: uuid().primaryKey().defaultRandom(),
		slug: text().notNull().unique(),
		name: text().notNull(),
		productType: productType().notNull(),
		structure: jsonb().$type<TemplateStructure>().notNull(),
		createdAt: createdAt()
	},
	(t) => [check('template_name_not_blank', notBlank(t.name))]
);

/**
 * `publishedAt` is the `produto_publicado` event and `createdAt` the `produto_criado`
 * one (regras-de-negocio section 8). A block by support is a `block` row, not a status.
 */
export const product = pgTable(
	'product',
	{
		id: uuid().primaryKey().defaultRandom(),
		producerId: uuid()
			.notNull()
			.references(() => user.id),
		templateId: uuid()
			.notNull()
			.references(() => template.id),
		name: text().notNull(),
		type: productType().notNull(),
		status: productStatus().notNull().default('draft'),
		brand: jsonb().$type<Brand>().notNull(),
		refundPolicy: text().notNull().default(''),
		publishedAt: at(),
		createdAt: createdAt()
	},
	(t) => [
		index('product_producer_id_idx').on(t.producerId),
		index('product_template_id_idx').on(t.templateId),
		unique('product_id_producer_id_unique').on(t.id, t.producerId),
		check('product_name_not_blank', notBlank(t.name)),
		check('product_published_at', setWhen(t.publishedAt, sql`${t.status} = 'published'`))
	]
);

/** Sales page, checkout and access e-mail; one of each per product (RF-11). */
export const page = pgTable(
	'page',
	{
		id: uuid().primaryKey().defaultRandom(),
		productId: uuid()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		type: pageType().notNull(),
		content: jsonb().$type<PageContent>().notNull()
	},
	(t) => [unique('page_product_id_type_unique').on(t.productId, t.type)]
);

/** `position` orders siblings; ties fall back to `createdAt`, so reordering is one update. */
export const module = pgTable(
	'module',
	{
		id: uuid().primaryKey().defaultRandom(),
		productId: uuid()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		title: text().notNull(),
		position: integer().notNull(),
		createdAt: createdAt()
	},
	(t) => [
		index('module_product_id_idx').on(t.productId, t.position),
		check('module_title_not_blank', notBlank(t.title)),
		check('module_position', sql`${t.position} >= 0`)
	]
);

/** RF-14. The video is a URL of an external player; nothing is hosted here. */
export const lesson = pgTable(
	'lesson',
	{
		id: uuid().primaryKey().defaultRandom(),
		moduleId: uuid()
			.notNull()
			.references(() => module.id, { onDelete: 'cascade' }),
		title: text().notNull(),
		videoUrl: text(),
		body: text(),
		attachmentUrl: text(),
		position: integer().notNull(),
		createdAt: createdAt()
	},
	(t) => [
		index('lesson_module_id_idx').on(t.moduleId, t.position),
		check('lesson_title_not_blank', notBlank(t.title)),
		check('lesson_position', sql`${t.position} >= 0`)
	]
);

/** Price and conditions. An offer with orders cannot be deleted (orders restrict it). */
export const offer = pgTable(
	'offer',
	{
		id: uuid().primaryKey().defaultRandom(),
		productId: uuid()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		priceCents: integer().notNull(),
		guaranteeDays: integer().notNull().default(GUARANTEE_DAYS),
		recurrence: recurrence().notNull().default('one_time'),
		createdAt: createdAt()
	},
	(t) => [
		index('offer_product_id_idx').on(t.productId),
		unique('offer_id_product_id_unique').on(t.id, t.productId),
		check('offer_name_not_blank', notBlank(t.name)),
		check('offer_price_min', sql`${t.priceCents} >= ${sql.raw(String(OFFER_MIN_PRICE_CENTS))}`),
		check('offer_guarantee_min', sql`${t.guaranteeDays} >= ${sql.raw(String(GUARANTEE_DAYS))}`)
	]
);

// ---------------------------------------------------------------------------
// Sale and delivery (RF-20 to RF-24)

/**
 * A purchase. Price, fee and guarantee are copied from the offer at checkout, so a later
 * offer change never rewrites a sale. `productId` is the offer's (composite foreign key)
 * and lets statements filter by product (RF-43). `externalId` makes the payment webhook
 * idempotent (RN-15).
 */
export const order = pgTable(
	'order',
	{
		id: uuid().primaryKey().defaultRandom(),
		offerId: uuid().notNull(),
		productId: uuid().notNull(),
		studentId: uuid()
			.notNull()
			.references(() => user.id),
		paymentMethod: paymentMethod().notNull(),
		grossCents: integer().notNull(),
		feeCents: integer().notNull(),
		guaranteeDays: integer().notNull(),
		status: orderStatus().notNull().default('pending'),
		externalId: text().unique(),
		paidAt: at(),
		createdAt: createdAt()
	},
	(t) => [
		foreignKey({
			name: 'order_offer_fk',
			columns: [t.offerId, t.productId],
			foreignColumns: [offer.id, offer.productId]
		}),
		index('order_offer_id_idx').on(t.offerId, t.productId),
		index('order_product_id_idx').on(t.productId, t.createdAt),
		index('order_student_id_idx').on(t.studentId, t.createdAt),
		unique('order_id_student_id_unique').on(t.id, t.studentId),
		check('order_gross_positive', sql`${t.grossCents} > 0`),
		check('order_fee_within_gross', sql`${t.feeCents} BETWEEN 0 AND ${t.grossCents}`),
		check('order_guarantee_min', sql`${t.guaranteeDays} >= ${sql.raw(String(GUARANTEE_DAYS))}`),
		check('order_paid_at', setWhen(t.paidAt, sql`${t.status} IN ('paid', 'refunded')`))
	]
);

/** The access a paid order grants (RF-22). Revoked when the refund completes (RN-06). */
export const enrollment = pgTable(
	'enrollment',
	{
		id: uuid().primaryKey().defaultRandom(),
		orderId: uuid()
			.notNull()
			.unique()
			.references(() => order.id),
		status: enrollmentStatus().notNull().default('active'),
		createdAt: createdAt(),
		revokedAt: at()
	},
	(t) => [check('enrollment_revoked_at', setWhen(t.revokedAt, sql`${t.status} = 'revoked'`))]
);

/**
 * RF-23. Kept per student and lesson, not per enrollment, so progress survives a second
 * purchase of the same product. Unmarking a lesson deletes the row.
 */
export const lessonProgress = pgTable(
	'lesson_progress',
	{
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		lessonId: uuid()
			.notNull()
			.references(() => lesson.id, { onDelete: 'cascade' }),
		completedAt: createdAt()
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.lessonId] }),
		index('lesson_progress_lesson_id_idx').on(t.lessonId)
	]
);

// ---------------------------------------------------------------------------
// Coproduction (RF-50 to RF-53)

/**
 * One version of the terms between a product and a coproducer. A percentage change is a
 * new row: on its acceptance the previous active row ends at that instant, so terms never
 * overlap (domain/coproduction.ts). In force while `active` and `acceptedAt <= t < endsAt`.
 * The invitee gets an account like a student at checkout (RF-03), so `coproducerId` is
 * always set. Trigger in 0002: shares in force stay within COPRODUCTION_MAX_BP and the
 * producer cannot coproduce their own product.
 */
export const coproduction = pgTable(
	'coproduction',
	{
		id: uuid().primaryKey().defaultRandom(),
		productId: uuid()
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		coproducerId: uuid()
			.notNull()
			.references(() => user.id),
		percentBp: integer().notNull(),
		/** Null means no end date. */
		durationDays: integer(),
		contractVersion: integer().notNull(),
		contractText: text().notNull(),
		status: coproductionStatus().notNull().default('invited'),
		createdAt: createdAt(),
		acceptedAt: at(),
		/** Exclusive. Set from the duration on acceptance, or when the term ends early. */
		endsAt: at()
	},
	(t) => [
		index('coproduction_product_id_idx').on(t.productId),
		index('coproduction_coproducer_id_idx').on(t.coproducerId),
		unique('coproduction_id_coproducer_id_unique').on(t.id, t.coproducerId),
		uniqueIndex('coproduction_one_invite')
			.on(t.productId, t.coproducerId)
			.where(sql`${t.status} = 'invited'`),
		uniqueIndex('coproduction_one_active')
			.on(t.productId, t.coproducerId)
			.where(sql`${t.status} = 'active'`),
		check('coproduction_percent_bp', sql`${t.percentBp} BETWEEN 1 AND 10000`),
		check('coproduction_duration', sql`${t.durationDays} > 0`),
		check('coproduction_contract_version', sql`${t.contractVersion} > 0`),
		check('coproduction_contract_not_blank', notBlank(t.contractText)),
		check(
			'coproduction_accepted_at',
			setWhen(t.acceptedAt, sql`${t.status} IN ('active', 'ended')`)
		),
		check(
			'coproduction_ends_at',
			sql`${t.endsAt} IS NULL OR (${t.acceptedAt} IS NOT NULL AND ${t.endsAt} > ${t.acceptedAt})`
		),
		check('coproduction_ended', sql`${t.status} <> 'ended' OR ${t.endsAt} IS NOT NULL`)
	]
);

/**
 * RF-51: proof of the acceptance (who, when, which text). The acceptor is the coproducer
 * (composite foreign key). Rows cannot change or be deleted (trigger in 0002).
 */
export const acceptance = pgTable(
	'acceptance',
	{
		id: uuid().primaryKey().defaultRandom(),
		coproductionId: uuid().notNull().unique(),
		userId: uuid().notNull(),
		contractVersion: integer().notNull(),
		/** SHA-256 hex of the contract text accepted. */
		textHash: text().notNull(),
		acceptedAt: createdAt()
	},
	(t) => [
		foreignKey({
			name: 'acceptance_coproduction_fk',
			columns: [t.coproductionId, t.userId],
			foreignColumns: [coproduction.id, coproduction.coproducerId]
		}),
		index('acceptance_user_id_idx').on(t.userId),
		check('acceptance_text_hash', sql`${t.textHash} ~ '^[0-9a-f]{64}$'`)
	]
);

// ---------------------------------------------------------------------------
// Money (RF-40 to RF-45)

/** RN-13. The amount leaves the released balance on request; `feeCents` comes out of it. */
export const payout = pgTable(
	'payout',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => user.id),
		amountCents: integer().notNull(),
		feeCents: integer().notNull(),
		status: payoutStatus().notNull().default('requested'),
		createdAt: createdAt(),
		decidedAt: at(),
		/** Support's reason, shown to the producer when the payout is declined. */
		declineReason: text()
	},
	(t) => [
		index('payout_user_id_idx').on(t.userId, t.createdAt),
		check('payout_fee_below_amount', sql`${t.feeCents} >= 0 AND ${t.feeCents} < ${t.amountCents}`),
		check('payout_decided_at', setWhen(t.decidedAt, sql`${t.status} <> 'requested'`)),
		check(
			'payout_decline_reason',
			sql`${t.status} <> 'declined'
				OR (${t.declineReason} IS NOT NULL AND btrim(${t.declineReason}) <> '')`
		)
	]
);

/**
 * The statement. The balance is never stored: it is the sum of `amountCents` per `state`
 * (domain/retention.ts `balance`). Only `state` ever changes, along ENTRY_TRANSITIONS; a
 * correction is a new entry pointing at the original (RN-14, trigger in 0002).
 *
 * - sale: a party's part of a paid order, born `held`, `released` at `releaseAt` (RN-04).
 *   A refund moves it to `reversed`.
 * - reversal: what a refund takes beyond the reversed sale, the party's part of the fixed
 *   fee the platform keeps (RN-06). Hits the released balance at once and may make it
 *   negative (RN-07).
 * - payout / payout_fee: on request, `-(amount - fee)` and `-fee` from released; on
 *   completion, `+(amount - fee)` as paid_out.
 * - adjustment: a correction, such as giving back a declined payout.
 */
export const ledgerEntry = pgTable(
	'ledger_entry',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => user.id),
		type: entryType().notNull(),
		/** Signed: credits are positive, debits negative. */
		amountCents: integer().notNull(),
		state: entryState().notNull(),
		/** Shown on every line of the statement (RF-42). */
		reason: text().notNull(),
		orderId: uuid().references(() => order.id),
		payoutId: uuid().references(() => payout.id),
		/** The coproduction term applied, on a coproducer's sale or reversal (RF-53). */
		coproductionId: uuid(),
		/** The entry this one reverses or corrects. */
		referenceId: uuid(),
		releaseAt: at(),
		createdAt: createdAt()
	},
	(t) => [
		foreignKey({
			name: 'ledger_entry_reference_fk',
			columns: [t.referenceId],
			foreignColumns: [t.id]
		}),
		foreignKey({
			name: 'ledger_entry_coproduction_fk',
			columns: [t.coproductionId, t.userId],
			foreignColumns: [coproduction.id, coproduction.coproducerId]
		}),
		index('ledger_entry_user_id_idx').on(t.userId, t.state, t.releaseAt),
		index('ledger_entry_release_idx')
			.on(t.releaseAt)
			.where(sql`${t.state} = 'held'`),
		index('ledger_entry_order_id_idx').on(t.orderId),
		index('ledger_entry_payout_id_idx').on(t.payoutId),
		index('ledger_entry_reference_id_idx').on(t.referenceId),
		uniqueIndex('ledger_entry_one_sale')
			.on(t.orderId, t.userId)
			.where(sql`${t.type} = 'sale'`),
		uniqueIndex('ledger_entry_one_reversal')
			.on(t.orderId, t.userId)
			.where(sql`${t.type} = 'reversal'`),
		uniqueIndex('ledger_entry_one_payout_part')
			.on(t.payoutId, t.type, t.state)
			.where(sql`${t.type} IN ('payout', 'payout_fee')`),
		uniqueIndex('ledger_entry_one_adjustment')
			.on(t.referenceId)
			.where(sql`${t.type} = 'adjustment'`),
		check('ledger_entry_reason_not_blank', notBlank(t.reason)),
		check(
			'ledger_entry_amount_sign',
			sql`CASE ${t.type}
				WHEN 'sale' THEN ${t.amountCents} > 0
				WHEN 'payout' THEN (${t.amountCents} < 0 AND ${t.state} = 'released')
					OR (${t.amountCents} > 0 AND ${t.state} = 'paid_out')
				WHEN 'adjustment' THEN ${t.amountCents} <> 0
				ELSE ${t.amountCents} < 0
			END`
		),
		check(
			'ledger_entry_state_by_type',
			sql`CASE ${t.type}
				WHEN 'sale' THEN ${t.state} <> 'paid_out'
				WHEN 'payout' THEN true
				ELSE ${t.state} = 'released'
			END`
		),
		check(
			'ledger_entry_links',
			sql`CASE ${t.type}
				WHEN 'sale' THEN ${t.orderId} IS NOT NULL AND ${t.payoutId} IS NULL
					AND ${t.referenceId} IS NULL AND ${t.releaseAt} IS NOT NULL
				WHEN 'reversal' THEN ${t.orderId} IS NOT NULL AND ${t.payoutId} IS NULL
					AND ${t.referenceId} IS NOT NULL
				WHEN 'adjustment' THEN ${t.referenceId} IS NOT NULL
				ELSE ${t.payoutId} IS NOT NULL AND ${t.orderId} IS NULL
			END`
		),
		check(
			'ledger_entry_coproduction',
			sql`${t.coproductionId} IS NULL OR ${t.type} IN ('sale', 'reversal')`
		)
	]
);

// ---------------------------------------------------------------------------
// Refund and support (RF-30 to RF-36, RF-60)

/**
 * One request per order (RN-09 allows one contest, not a second request). It always has
 * an owner and a deadline (RN-10); domain/refund.ts moves it. `openedAt` and
 * `firstResponseAt` feed the response-time metric.
 */
export const refund = pgTable(
	'refund',
	{
		id: uuid().primaryKey().defaultRandom(),
		orderId: uuid()
			.notNull()
			.unique()
			.references(() => order.id),
		reason: text().notNull(),
		status: refundStatus().notNull(),
		owner: refundOwner().notNull(),
		dueAt: at().notNull(),
		contested: boolean().notNull().default(false),
		declineReason: text(),
		openedAt: createdAt(),
		firstResponseAt: at()
	},
	(t) => [
		index('refund_queue_idx').on(t.status, t.dueAt),
		check('refund_reason_not_blank', notBlank(t.reason)),
		check(
			'refund_owner_matches_status',
			sql`CASE ${t.status}
				WHEN 'with_producer' THEN ${t.owner} = 'producer'
				WHEN 'with_platform' THEN ${t.owner} = 'platform'
				ELSE true
			END`
		),
		check(
			'refund_decline_reason',
			sql`${t.status} NOT IN ('declined', 'final_declined')
				OR (${t.declineReason} IS NOT NULL AND btrim(${t.declineReason}) <> '')`
		),
		check('refund_first_response', sql`${t.firstResponseAt} >= ${t.openedAt}`)
	]
);

/** RF-35: a student's support ticket about one of their orders (composite foreign key). */
export const ticket = pgTable(
	'ticket',
	{
		id: uuid().primaryKey().defaultRandom(),
		orderId: uuid().notNull(),
		studentId: uuid().notNull(),
		subject: text().notNull(),
		status: ticketStatus().notNull().default('open'),
		createdAt: createdAt(),
		closedAt: at()
	},
	(t) => [
		foreignKey({
			name: 'ticket_order_fk',
			columns: [t.orderId, t.studentId],
			foreignColumns: [order.id, order.studentId]
		}),
		index('ticket_order_id_idx').on(t.orderId, t.studentId),
		index('ticket_queue_idx').on(t.status, t.createdAt),
		check('ticket_subject_not_blank', notBlank(t.subject)),
		check('ticket_closed_at', setWhen(t.closedAt, sql`${t.status} = 'closed'`))
	]
);

/** A conversation line on exactly one refund or ticket. */
export const message = pgTable(
	'message',
	{
		id: uuid().primaryKey().defaultRandom(),
		refundId: uuid().references(() => refund.id),
		ticketId: uuid().references(() => ticket.id),
		authorId: uuid()
			.notNull()
			.references(() => user.id),
		body: text().notNull(),
		createdAt: createdAt()
	},
	(t) => [
		index('message_refund_id_idx').on(t.refundId, t.createdAt),
		index('message_ticket_id_idx').on(t.ticketId, t.createdAt),
		index('message_author_id_idx').on(t.authorId),
		check('message_one_thread', sql`num_nonnulls(${t.refundId}, ${t.ticketId}) = 1`),
		check('message_body_not_blank', notBlank(t.body))
	]
);

// ---------------------------------------------------------------------------
// Administration (RF-45, RF-61, RF-62)

/**
 * RN-11: a block by support always says why and what to do next. In force while
 * `liftedAt` is null and `endsAt` is null or in the future. A product block names one of
 * the user's products (composite foreign key).
 */
export const block = pgTable(
	'block',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => user.id),
		target: blockTarget().notNull(),
		productId: uuid(),
		reason: text().notNull(),
		nextStep: text().notNull(),
		endsAt: at(),
		createdById: uuid()
			.notNull()
			.references(() => user.id),
		createdAt: createdAt(),
		liftedAt: at(),
		liftedById: uuid().references(() => user.id)
	},
	(t) => [
		foreignKey({
			name: 'block_product_fk',
			columns: [t.productId, t.userId],
			foreignColumns: [product.id, product.producerId]
		}),
		index('block_user_id_idx')
			.on(t.userId)
			.where(sql`${t.liftedAt} IS NULL`),
		index('block_product_id_idx').on(t.productId),
		index('block_created_by_id_idx').on(t.createdById),
		index('block_lifted_by_id_idx').on(t.liftedById),
		check('block_reason_not_blank', notBlank(t.reason)),
		check('block_next_step_not_blank', notBlank(t.nextStep)),
		check('block_product', setWhen(t.productId, sql`${t.target} = 'product'`)),
		check('block_ends_at', sql`${t.endsAt} > ${t.createdAt}`),
		check('block_lifted', sql`(${t.liftedAt} IS NULL) = (${t.liftedById} IS NULL)`)
	]
);

/** RF-62: every support action. Rows cannot change or be deleted (trigger in 0002). */
export const auditLog = pgTable(
	'audit_log',
	{
		id: uuid().primaryKey().defaultRandom(),
		actorId: uuid()
			.notNull()
			.references(() => user.id),
		action: text().notNull(),
		detail: jsonb().$type<Record<string, unknown>>().notNull().default({}),
		createdAt: createdAt()
	},
	(t) => [
		index('audit_log_actor_id_idx').on(t.actorId, t.createdAt),
		index('audit_log_created_at_idx').on(t.createdAt),
		check('audit_log_action_not_blank', notBlank(t.action))
	]
);
