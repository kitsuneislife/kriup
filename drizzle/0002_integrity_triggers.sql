-- Invariants that span rows or forbid changes, which CHECK constraints cannot express.
-- Rules: docs/tecnico/modelo-de-dados.md section 2. Errors use SQLSTATE 23514
-- (check_violation), like the CHECK constraints, so the app maps them the same way.

-- RN-14: a ledger entry never changes except its state, and only along
-- ENTRY_TRANSITIONS (src/lib/domain/states.ts). A sale is born held; nothing is born
-- reversed. Corrections are new entries.
CREATE FUNCTION ledger_entry_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'ledger entries cannot be deleted (RN-14)' USING ERRCODE = 'check_violation';
	END IF;
	IF TG_OP = 'INSERT' THEN
		IF (NEW.type = 'sale') <> (NEW.state = 'held') OR NEW.state = 'reversed' THEN
			RAISE EXCEPTION 'a % entry cannot start as %', NEW.type, NEW.state
				USING ERRCODE = 'check_violation';
		END IF;
		RETURN NEW;
	END IF;
	IF (to_jsonb(NEW) - 'state') IS DISTINCT FROM (to_jsonb(OLD) - 'state') THEN
		RAISE EXCEPTION 'only the state of a ledger entry can change (RN-14)'
			USING ERRCODE = 'check_violation';
	END IF;
	IF NEW.state <> OLD.state AND NOT (
		(OLD.state = 'held' AND NEW.state IN ('released', 'reversed'))
		OR (OLD.state = 'released' AND NEW.state IN ('paid_out', 'reversed'))
	) THEN
		RAISE EXCEPTION 'a ledger entry cannot go from % to %', OLD.state, NEW.state
			USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER ledger_entry_guard BEFORE INSERT OR UPDATE OR DELETE ON ledger_entry
	FOR EACH ROW EXECUTE FUNCTION ledger_entry_guard();
--> statement-breakpoint

-- RN-12: the shares in force on a product stay within COPRODUCTION_MAX_BP
-- (src/lib/domain/params.ts; coproduction.int.test.ts fails if the two drift), and a
-- producer is never a coproducer of their own product. Locking the product row makes
-- concurrent acceptances on one product wait for each other, so both cannot pass.
CREATE FUNCTION coproduction_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
	owner_id uuid;
	total integer;
BEGIN
	SELECT producer_id INTO owner_id FROM product WHERE id = NEW.product_id FOR UPDATE;
	IF NEW.coproducer_id = owner_id THEN
		RAISE EXCEPTION 'a producer cannot coproduce their own product'
			USING ERRCODE = 'check_violation';
	END IF;
	IF NEW.status = 'active' THEN
		SELECT coalesce(sum(percent_bp), 0) INTO total FROM coproduction
		WHERE product_id = NEW.product_id AND status = 'active'
			AND (ends_at IS NULL OR ends_at > now());
		IF total > 9000 THEN
			RAISE EXCEPTION 'coproducer shares in force would be % bp, above 9000 (RN-12)', total
				USING ERRCODE = 'check_violation';
		END IF;
	END IF;
	RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER coproduction_guard AFTER INSERT OR UPDATE ON coproduction
	FOR EACH ROW EXECUTE FUNCTION coproduction_guard();
--> statement-breakpoint

-- RF-51 and RF-62: acceptances and the audit log are records; they never change.
CREATE FUNCTION forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION '% rows cannot be changed or deleted', TG_TABLE_NAME
		USING ERRCODE = 'check_violation';
END $$;
--> statement-breakpoint
CREATE TRIGGER acceptance_append_only BEFORE UPDATE OR DELETE ON acceptance
	FOR EACH ROW EXECUTE FUNCTION forbid_change();
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
	FOR EACH ROW EXECUTE FUNCTION forbid_change();
