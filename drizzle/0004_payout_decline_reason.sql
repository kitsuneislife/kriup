ALTER TABLE "payout" ADD COLUMN "decline_reason" text;--> statement-breakpoint
-- Payouts declined before this column: the reason is in the audit of the decision.
UPDATE "payout" SET "decline_reason" = coalesce(
	(SELECT "detail"->>'reason' FROM "audit_log"
		WHERE "action" = 'payout.decline' AND "detail"->>'payoutId' = "payout"."id"::text
		ORDER BY "created_at" DESC LIMIT 1),
	'Motivo não registrado'
) WHERE "status" = 'declined';--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_decline_reason" CHECK ("payout"."status" <> 'declined'
				OR ("payout"."decline_reason" IS NOT NULL AND btrim("payout"."decline_reason") <> ''));
