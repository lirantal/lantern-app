-- The audit trail is append-only: reject any UPDATE or DELETE at the database level.
CREATE TRIGGER audit_event_no_update
BEFORE UPDATE ON audit_event
BEGIN
  SELECT RAISE(ABORT, 'audit_event is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER audit_event_no_delete
BEFORE DELETE ON audit_event
BEGIN
  SELECT RAISE(ABORT, 'audit_event is immutable');
END;
--> statement-breakpoint
-- Items are never hard-deleted (their audit history must stay referentially intact).
CREATE TRIGGER item_no_delete
BEFORE DELETE ON item
BEGIN
  SELECT RAISE(ABORT, 'items cannot be deleted');
END;
--> statement-breakpoint
INSERT INTO product (name, created_at) VALUES ('General', unixepoch() * 1000);
