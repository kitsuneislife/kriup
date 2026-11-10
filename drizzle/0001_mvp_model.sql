CREATE TYPE "public"."block_target" AS ENUM('balance', 'product', 'account');--> statement-breakpoint
CREATE TYPE "public"."coproduction_status" AS ENUM('invited', 'active', 'ended', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."entry_state" AS ENUM('held', 'released', 'paid_out', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('sale', 'reversal', 'payout', 'payout_fee', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'expired', 'declined', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('sales', 'checkout', 'access_email');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'card');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('requested', 'completed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('user', 'support');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('course', 'mentorship', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('one_time', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."refund_owner" AS ENUM('producer', 'platform');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('with_producer', 'declined', 'with_platform', 'approved', 'final_declined', 'completed');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "acceptance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coproduction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"contract_version" integer NOT NULL,
	"text_hash" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acceptance_coproductionId_unique" UNIQUE("coproduction_id"),
	CONSTRAINT "acceptance_text_hash" CHECK ("acceptance"."text_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_log_action_not_blank" CHECK (btrim("audit_log"."action") <> '')
);
--> statement-breakpoint
CREATE TABLE "block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target" "block_target" NOT NULL,
	"product_id" uuid,
	"reason" text NOT NULL,
	"next_step" text NOT NULL,
	"ends_at" timestamp with time zone,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lifted_at" timestamp with time zone,
	"lifted_by_id" uuid,
	CONSTRAINT "block_reason_not_blank" CHECK (btrim("block"."reason") <> ''),
	CONSTRAINT "block_next_step_not_blank" CHECK (btrim("block"."next_step") <> ''),
	CONSTRAINT "block_product" CHECK (("block"."product_id" IS NOT NULL) = ("block"."target" = 'product')),
	CONSTRAINT "block_ends_at" CHECK ("block"."ends_at" > "block"."created_at"),
	CONSTRAINT "block_lifted" CHECK (("block"."lifted_at" IS NULL) = ("block"."lifted_by_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "coproduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"coproducer_id" uuid NOT NULL,
	"percent_bp" integer NOT NULL,
	"duration_days" integer,
	"contract_version" integer NOT NULL,
	"contract_text" text NOT NULL,
	"status" "coproduction_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	CONSTRAINT "coproduction_id_coproducer_id_unique" UNIQUE("id","coproducer_id"),
	CONSTRAINT "coproduction_percent_bp" CHECK ("coproduction"."percent_bp" BETWEEN 1 AND 10000),
	CONSTRAINT "coproduction_duration" CHECK ("coproduction"."duration_days" > 0),
	CONSTRAINT "coproduction_contract_version" CHECK ("coproduction"."contract_version" > 0),
	CONSTRAINT "coproduction_contract_not_blank" CHECK (btrim("coproduction"."contract_text") <> ''),
	CONSTRAINT "coproduction_accepted_at" CHECK (("coproduction"."accepted_at" IS NOT NULL) = ("coproduction"."status" IN ('active', 'ended'))),
	CONSTRAINT "coproduction_ends_at" CHECK ("coproduction"."ends_at" IS NULL OR ("coproduction"."accepted_at" IS NOT NULL AND "coproduction"."ends_at" > "coproduction"."accepted_at")),
	CONSTRAINT "coproduction_ended" CHECK ("coproduction"."status" <> 'ended' OR "coproduction"."ends_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "enrollment_orderId_unique" UNIQUE("order_id"),
	CONSTRAINT "enrollment_revoked_at" CHECK (("enrollment"."revoked_at" IS NOT NULL) = ("enrollment"."status" = 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "entry_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"state" "entry_state" NOT NULL,
	"reason" text NOT NULL,
	"order_id" uuid,
	"payout_id" uuid,
	"coproduction_id" uuid,
	"reference_id" uuid,
	"release_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entry_reason_not_blank" CHECK (btrim("ledger_entry"."reason") <> ''),
	CONSTRAINT "ledger_entry_amount_sign" CHECK (CASE "ledger_entry"."type"
				WHEN 'sale' THEN "ledger_entry"."amount_cents" > 0
				WHEN 'payout' THEN ("ledger_entry"."amount_cents" < 0 AND "ledger_entry"."state" = 'released')
					OR ("ledger_entry"."amount_cents" > 0 AND "ledger_entry"."state" = 'paid_out')
				WHEN 'adjustment' THEN "ledger_entry"."amount_cents" <> 0
				ELSE "ledger_entry"."amount_cents" < 0
			END),
	CONSTRAINT "ledger_entry_state_by_type" CHECK (CASE "ledger_entry"."type"
				WHEN 'sale' THEN "ledger_entry"."state" <> 'paid_out'
				WHEN 'payout' THEN true
				ELSE "ledger_entry"."state" = 'released'
			END),
	CONSTRAINT "ledger_entry_links" CHECK (CASE "ledger_entry"."type"
				WHEN 'sale' THEN "ledger_entry"."order_id" IS NOT NULL AND "ledger_entry"."payout_id" IS NULL
					AND "ledger_entry"."reference_id" IS NULL AND "ledger_entry"."release_at" IS NOT NULL
				WHEN 'reversal' THEN "ledger_entry"."order_id" IS NOT NULL AND "ledger_entry"."payout_id" IS NULL
					AND "ledger_entry"."reference_id" IS NOT NULL
				WHEN 'adjustment' THEN "ledger_entry"."reference_id" IS NOT NULL
				ELSE "ledger_entry"."payout_id" IS NOT NULL AND "ledger_entry"."order_id" IS NULL
			END),
	CONSTRAINT "ledger_entry_coproduction" CHECK ("ledger_entry"."coproduction_id" IS NULL OR "ledger_entry"."type" IN ('sale', 'reversal'))
);
--> statement-breakpoint
CREATE TABLE "lesson" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"video_url" text,
	"body" text,
	"attachment_url" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_title_not_blank" CHECK (btrim("lesson"."title") <> ''),
	CONSTRAINT "lesson_position" CHECK ("lesson"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refund_id" uuid,
	"ticket_id" uuid,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_one_thread" CHECK (num_nonnulls("message"."refund_id", "message"."ticket_id") = 1),
	CONSTRAINT "message_body_not_blank" CHECK (btrim("message"."body") <> '')
);
--> statement-breakpoint
CREATE TABLE "module" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "module_title_not_blank" CHECK (btrim("module"."title") <> ''),
	CONSTRAINT "module_position" CHECK ("module"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"guarantee_days" integer DEFAULT 7 NOT NULL,
	"recurrence" "recurrence" DEFAULT 'one_time' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_id_product_id_unique" UNIQUE("id","product_id"),
	CONSTRAINT "offer_name_not_blank" CHECK (btrim("offer"."name") <> ''),
	CONSTRAINT "offer_price_min" CHECK ("offer"."price_cents" >= 500),
	CONSTRAINT "offer_guarantee_min" CHECK ("offer"."guarantee_days" >= 7)
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"gross_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"guarantee_days" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"external_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_externalId_unique" UNIQUE("external_id"),
	CONSTRAINT "order_id_student_id_unique" UNIQUE("id","student_id"),
	CONSTRAINT "order_gross_positive" CHECK ("order"."gross_cents" > 0),
	CONSTRAINT "order_fee_within_gross" CHECK ("order"."fee_cents" BETWEEN 0 AND "order"."gross_cents"),
	CONSTRAINT "order_guarantee_min" CHECK ("order"."guarantee_days" >= 7),
	CONSTRAINT "order_paid_at" CHECK (("order"."paid_at" IS NOT NULL) = ("order"."status" IN ('paid', 'refunded')))
);
--> statement-breakpoint
CREATE TABLE "page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "page_type" NOT NULL,
	"content" jsonb NOT NULL,
	CONSTRAINT "page_product_id_type_unique" UNIQUE("product_id","type")
);
--> statement-breakpoint
CREATE TABLE "password_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"status" "payout_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "payout_fee_below_amount" CHECK ("payout"."fee_cents" >= 0 AND "payout"."fee_cents" < "payout"."amount_cents"),
	CONSTRAINT "payout_decided_at" CHECK (("payout"."decided_at" IS NOT NULL) = ("payout"."status" <> 'requested'))
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producer_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "product_type" NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"brand" jsonb NOT NULL,
	"refund_policy" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_id_producer_id_unique" UNIQUE("id","producer_id"),
	CONSTRAINT "product_name_not_blank" CHECK (btrim("product"."name") <> ''),
	CONSTRAINT "product_published_at" CHECK (("product"."published_at" IS NOT NULL) = ("product"."status" = 'published'))
);
--> statement-breakpoint
CREATE TABLE "refund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" NOT NULL,
	"owner" "refund_owner" NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"contested" boolean DEFAULT false NOT NULL,
	"decline_reason" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_response_at" timestamp with time zone,
	CONSTRAINT "refund_orderId_unique" UNIQUE("order_id"),
	CONSTRAINT "refund_reason_not_blank" CHECK (btrim("refund"."reason") <> ''),
	CONSTRAINT "refund_owner_matches_status" CHECK (CASE "refund"."status"
				WHEN 'with_producer' THEN "refund"."owner" = 'producer'
				WHEN 'with_platform' THEN "refund"."owner" = 'platform'
				ELSE true
			END),
	CONSTRAINT "refund_decline_reason" CHECK ("refund"."status" NOT IN ('declined', 'final_declined')
				OR ("refund"."decline_reason" IS NOT NULL AND btrim("refund"."decline_reason") <> '')),
	CONSTRAINT "refund_first_response" CHECK ("refund"."first_response_at" >= "refund"."opened_at")
);
--> statement-breakpoint
CREATE TABLE "template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"product_type" "product_type" NOT NULL,
	"structure" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_slug_unique" UNIQUE("slug"),
	CONSTRAINT "template_name_not_blank" CHECK (btrim("template"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "ticket_subject_not_blank" CHECK (btrim("ticket"."subject") <> ''),
	CONSTRAINT "ticket_closed_at" CHECK (("ticket"."closed_at" IS NOT NULL) = ("ticket"."status" = 'closed'))
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "platform_role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "platform_role" SET DATA TYPE "public"."platform_role" USING "platform_role"::"public"."platform_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "platform_role" SET DEFAULT 'user'::"public"."platform_role";--> statement-breakpoint
ALTER TABLE "acceptance" ADD CONSTRAINT "acceptance_coproduction_fk" FOREIGN KEY ("coproduction_id","user_id") REFERENCES "public"."coproduction"("id","coproducer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_lifted_by_id_user_id_fk" FOREIGN KEY ("lifted_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_product_fk" FOREIGN KEY ("product_id","user_id") REFERENCES "public"."product"("id","producer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coproduction" ADD CONSTRAINT "coproduction_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coproduction" ADD CONSTRAINT "coproduction_coproducer_id_user_id_fk" FOREIGN KEY ("coproducer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_payout_id_payout_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payout"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_reference_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."ledger_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_coproduction_fk" FOREIGN KEY ("coproduction_id","user_id") REFERENCES "public"."coproduction"("id","coproducer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_refund_id_refund_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."refund"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_offer_fk" FOREIGN KEY ("offer_id","product_id") REFERENCES "public"."offer"("id","product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_token" ADD CONSTRAINT "password_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_producer_id_user_id_fk" FOREIGN KEY ("producer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_order_fk" FOREIGN KEY ("order_id","student_id") REFERENCES "public"."order"("id","student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acceptance_user_id_idx" ON "acceptance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "block_user_id_idx" ON "block" USING btree ("user_id") WHERE "block"."lifted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "block_product_id_idx" ON "block" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "block_created_by_id_idx" ON "block" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "block_lifted_by_id_idx" ON "block" USING btree ("lifted_by_id");--> statement-breakpoint
CREATE INDEX "coproduction_product_id_idx" ON "coproduction" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "coproduction_coproducer_id_idx" ON "coproduction" USING btree ("coproducer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coproduction_one_invite" ON "coproduction" USING btree ("product_id","coproducer_id") WHERE "coproduction"."status" = 'invited';--> statement-breakpoint
CREATE UNIQUE INDEX "coproduction_one_active" ON "coproduction" USING btree ("product_id","coproducer_id") WHERE "coproduction"."status" = 'active';--> statement-breakpoint
CREATE INDEX "ledger_entry_user_id_idx" ON "ledger_entry" USING btree ("user_id","state","release_at");--> statement-breakpoint
CREATE INDEX "ledger_entry_release_idx" ON "ledger_entry" USING btree ("release_at") WHERE "ledger_entry"."state" = 'held';--> statement-breakpoint
CREATE INDEX "ledger_entry_order_id_idx" ON "ledger_entry" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ledger_entry_payout_id_idx" ON "ledger_entry" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX "ledger_entry_reference_id_idx" ON "ledger_entry" USING btree ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_one_sale" ON "ledger_entry" USING btree ("order_id","user_id") WHERE "ledger_entry"."type" = 'sale';--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_one_reversal" ON "ledger_entry" USING btree ("order_id","user_id") WHERE "ledger_entry"."type" = 'reversal';--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_one_payout_part" ON "ledger_entry" USING btree ("payout_id","type","state") WHERE "ledger_entry"."type" IN ('payout', 'payout_fee');--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_one_adjustment" ON "ledger_entry" USING btree ("reference_id") WHERE "ledger_entry"."type" = 'adjustment';--> statement-breakpoint
CREATE INDEX "lesson_module_id_idx" ON "lesson" USING btree ("module_id","position");--> statement-breakpoint
CREATE INDEX "lesson_progress_lesson_id_idx" ON "lesson_progress" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "message_refund_id_idx" ON "message" USING btree ("refund_id","created_at");--> statement-breakpoint
CREATE INDEX "message_ticket_id_idx" ON "message" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "message_author_id_idx" ON "message" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "module_product_id_idx" ON "module" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "offer_product_id_idx" ON "offer" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_offer_id_idx" ON "order" USING btree ("offer_id","product_id");--> statement-breakpoint
CREATE INDEX "order_product_id_idx" ON "order" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "order_student_id_idx" ON "order" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "password_token_user_id_idx" ON "password_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payout_user_id_idx" ON "payout" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "product_producer_id_idx" ON "product" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "product_template_id_idx" ON "product" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "refund_queue_idx" ON "refund" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "ticket_order_id_idx" ON "ticket" USING btree ("order_id","student_id");--> statement-breakpoint
CREATE INDEX "ticket_queue_idx" ON "ticket" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_name_not_blank" CHECK (btrim("user"."name") <> '');