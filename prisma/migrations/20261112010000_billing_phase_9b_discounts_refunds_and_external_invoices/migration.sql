-- Update 72 / Phase 9B
-- Adds an explicitly typed external diagnostic-intake invoice source and the
-- audit/payment details required to complete an approved refund. Existing
-- Encounter invoices remain linked exactly as before.

ALTER TABLE "Invoice"
  ALTER COLUMN "encounterId" DROP NOT NULL,
  ADD COLUMN "externalLabIntakeId" TEXT;

CREATE UNIQUE INDEX "Invoice_externalLabIntakeId_key"
  ON "Invoice"("externalLabIntakeId");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_externalLabIntakeId_fkey"
    FOREIGN KEY ("externalLabIntakeId") REFERENCES "ExternalLabIntake"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Invoice_exactly_one_source_chk"
    CHECK (("encounterId" IS NOT NULL) <> ("externalLabIntakeId" IS NOT NULL));

-- The source patient is authoritative. Do not allow a cashier to attach an
-- invoice to an Encounter/ExternalLabIntake belonging to a different Patient.
CREATE FUNCTION "enforce_invoice_source_patient_match"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_patient_id TEXT;
BEGIN
  IF NEW."encounterId" IS NOT NULL THEN
    SELECT "patientId" INTO v_source_patient_id
      FROM "Encounter" WHERE "id" = NEW."encounterId";
  ELSE
    SELECT "patientId" INTO v_source_patient_id
      FROM "ExternalLabIntake" WHERE "id" = NEW."externalLabIntakeId";
  END IF;

  IF v_source_patient_id IS NULL OR v_source_patient_id IS DISTINCT FROM NEW."patientId" THEN
    RAISE EXCEPTION 'Invoice patient must match its single billing source'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Invoice_source_patient_guard_trg"
BEFORE INSERT OR UPDATE OF "patientId", "encounterId", "externalLabIntakeId"
ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION "enforce_invoice_source_patient_match"();

ALTER TABLE "Refund"
  ADD COLUMN "decidedByEmployeeId" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMPTZ(3),
  ADD COLUMN "completedByEmployeeId" TEXT,
  ADD COLUMN "paymentMethod" "PaymentMethod",
  ADD COLUMN "transactionReference" VARCHAR(120);

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_decidedByEmployeeId_fkey"
    FOREIGN KEY ("decidedByEmployeeId") REFERENCES "Employee"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Refund_completedByEmployeeId_fkey"
    FOREIGN KEY ("completedByEmployeeId") REFERENCES "Employee"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Refund_completion_audit_state_chk"
    CHECK (
      (
        "status" = 'COMPLETED'
        AND "approvedByEmployeeId" IS NOT NULL
        AND "approvedAt" IS NOT NULL
        AND "decidedByEmployeeId" IS NOT NULL
        AND "decidedAt" IS NOT NULL
        AND "completedByEmployeeId" IS NOT NULL
        AND "completedAt" IS NOT NULL
        AND "paymentMethod" IS NOT NULL
        AND (
          ("paymentMethod" = 'CASH' AND "transactionReference" IS NULL)
          OR
          ("paymentMethod" IN ('POS_CARD', 'CLINIC_E_WALLET')
            AND "transactionReference" IS NOT NULL
            AND length(btrim("transactionReference")) > 0)
        )
      )
      OR
      (
        "status" <> 'COMPLETED'
        AND "completedByEmployeeId" IS NULL
        AND "completedAt" IS NULL
        AND "paymentMethod" IS NULL
        AND "transactionReference" IS NULL
      )
    );

CREATE INDEX "Refund_decidedByEmployeeId_decidedAt_idx"
  ON "Refund"("decidedByEmployeeId", "decidedAt");

CREATE INDEX "Refund_completedByEmployeeId_completedAt_idx"
  ON "Refund"("completedByEmployeeId", "completedAt");
