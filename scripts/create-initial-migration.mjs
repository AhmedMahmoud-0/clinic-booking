import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const schemaPath = resolve(projectRoot, "prisma/schema.prisma");
const packagePath = resolve(projectRoot, "node_modules/prisma/package.json");
const migrationsPath = resolve(projectRoot, "prisma/migrations");
const migrationName = "20261105230000_initial_schema";
const migrationDirectory = resolve(migrationsPath, migrationName);
const migrationFile = resolve(migrationDirectory, "migration.sql");
const previewBackupDirectory = resolve(projectRoot, "prisma/migration-preview-backups");
const lockFile = resolve(migrationsPath, "migration_lock.toml");

function fail(message) {
  console.error(`\nMERUNO migration preview stopped: ${message}\n`);
  process.exit(1);
}

if (!existsSync(schemaPath)) fail("Run this command from the MERUNO project root; prisma/schema.prisma was not found.");
if (!existsSync(packagePath)) fail("Local Prisma CLI was not found. Run npm install first.");

// A prior Phase 2E review draft may exist locally. Preserve it outside the
// Prisma migrations directory before refreshing the same, known initial draft.
if (existsSync(migrationDirectory)) {
  if (!statSync(migrationDirectory).isDirectory()) fail(`The target migration path is not a directory: ${migrationDirectory}`);
  const existingFiles = readdirSync(migrationDirectory);
  if (existingFiles.length !== 1 || existingFiles[0] !== "migration.sql" || !existsSync(migrationFile)) {
    fail(`The target migration folder contains unexpected files (${existingFiles.join(", ")}). It will not be overwritten.`);
  }

  mkdirSync(previewBackupDirectory, { recursive: true });
  let backupNumber = 1;
  let backupFile = resolve(previewBackupDirectory, `${migrationName}.previous-${backupNumber}.sql`);
  while (existsSync(backupFile)) {
    backupNumber += 1;
    backupFile = resolve(previewBackupDirectory, `${migrationName}.previous-${backupNumber}.sql`);
  }
  copyFileSync(migrationFile, backupFile);
  console.log(`Preserved the previous SQL draft at: ${backupFile}`);
}

if (existsSync(migrationsPath)) {
  const existing = readdirSync(migrationsPath).filter((entry) => entry !== "migration_lock.toml" && entry !== migrationName);
  if (existing.length > 0) {
    fail(`prisma/migrations already contains other entries (${existing.join(", ")}). A baseline migration must not be generated over existing migration history.`);
  }
}

const prismaPackage = JSON.parse(readFileSync(packagePath, "utf8"));
const prismaBin = typeof prismaPackage.bin === "string" ? prismaPackage.bin : prismaPackage.bin?.prisma;
if (!prismaBin) fail("The installed Prisma package does not expose its CLI entry point.");
const prismaCliPath = resolve(dirname(packagePath), prismaBin);

console.log("Generating an initial migration script from the current Prisma schema.");
console.log("This command uses --from-empty and --to-schema; it does NOT apply SQL to PostgreSQL.\n");

const result = spawnSync(
  process.execPath,
  [
    prismaCliPath,
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema=./prisma/schema.prisma",
    "--script",
    "--config=./prisma7.config.ts",
  ],
  { cwd: projectRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

if (result.error) fail(result.error.message);
if (result.status !== 0) {
  if (result.stdout) console.error(result.stdout);
  if (result.stderr) console.error(result.stderr);
  fail(`Prisma migrate diff exited with code ${result.status}. No migration file was created.`);
}

const rawOutput = result.stdout ?? "";
// Prisma may print config/schema notices before the SQL. Start at the first DDL marker
// so informational output can never be written into migration.sql as invalid SQL.
const sqlMarkers = ["-- CreateEnum", "CREATE TYPE", "CREATE TABLE"];
const sqlStart = sqlMarkers
  .map((marker) => rawOutput.indexOf(marker))
  .filter((index) => index >= 0)
  .sort((a, b) => a - b)[0];
if (sqlStart === undefined) {
  if (result.stderr) console.error(result.stderr);
  fail("Prisma returned no recognizable SQL DDL. No migration file was created.");
}
const generatedSql = rawOutput.slice(sqlStart).trim();
if (!generatedSql.includes("CREATE TABLE") || !generatedSql.includes('"Appointment"')) {
  if (result.stderr) console.error(result.stderr);
  fail("Prisma returned no recognizable initial table DDL. No migration file was created.");
}

const customSql = String.raw`

-- -----------------------------------------------------------------------------
-- MERUNO custom PostgreSQL integrity rules (not expressible in Prisma Schema).
-- Requires PostgreSQL's standard btree_gist extension for overlap exclusion.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Master data and schedule integrity.
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employment_dates_chk" CHECK ("hiredOn" IS NULL OR "endedOn" IS NULL OR "endedOn" >= "hiredOn");
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_experience_nonnegative_chk" CHECK ("yearsOfExperience" IS NULL OR "yearsOfExperience" >= 0);
CREATE UNIQUE INDEX "DoctorSpecialty_one_primary_per_doctor_uq" ON "DoctorSpecialty" ("doctorId") WHERE "isPrimary" = TRUE;
ALTER TABLE "DoctorService" ADD CONSTRAINT "DoctorService_valid_price_duration_chk" CHECK ("durationMinutes" > 0 AND "price" >= 0);
ALTER TABLE "DoctorWeeklySchedule" ADD CONSTRAINT "DoctorWeeklySchedule_minutes_range_chk" CHECK ("startMinuteOfDay" >= 0 AND "startMinuteOfDay" < "endMinuteOfDay" AND "endMinuteOfDay" <= 1440), ADD CONSTRAINT "DoctorWeeklySchedule_effective_dates_chk" CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" >= "effectiveFrom");
ALTER TABLE "DoctorScheduleException" ADD CONSTRAINT "DoctorScheduleException_time_range_chk" CHECK ("endsAt" > "startsAt");
ALTER TABLE "PatientRelationship" ADD CONSTRAINT "PatientRelationship_not_self_chk" CHECK ("patientId" <> "relatedPatientId"), ADD CONSTRAINT "PatientRelationship_guardian_verification_chk" CHECK (NOT "isLegalGuardian" OR ("guardianVerifiedAt" IS NOT NULL AND "guardianVerifiedByEmployeeId" IS NOT NULL));
CREATE UNIQUE INDEX "PatientContact_one_primary_per_type_uq" ON "PatientContact" ("patientId", "type") WHERE "isPrimary" = TRUE;

-- Booking integrity, including race-safe overlap prevention.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_time_range_chk" CHECK ("endsAt" > "startsAt"), ADD CONSTRAINT "Appointment_duration_price_chk" CHECK ("durationMinutes" > 0 AND "bookedPrice" >= 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctor_no_overlap" EXCLUDE USING GIST ("doctorId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_no_overlap" EXCLUDE USING GIST ("patientId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION'));
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_actor_matches_source_chk" CHECK (("changeSource" = 'STAFF' AND "changedByEmployeeId" IS NOT NULL AND "changedByPatientId" IS NULL) OR ("changeSource" = 'PATIENT' AND "changedByEmployeeId" IS NULL AND "changedByPatientId" IS NOT NULL) OR ("changeSource" = 'SYSTEM' AND "changedByEmployeeId" IS NULL AND "changedByPatientId" IS NULL));
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_queue_number_positive_chk" CHECK ("queueNumber" > 0);
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_distinct_elements_chk" CHECK ("firstElement" <> "secondElement");
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_has_visit_origin_chk" CHECK ("appointmentId" IS NOT NULL OR "queueEntryId" IS NOT NULL);

-- Clinical record integrity.
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_signature_state_chk" CHECK (("status" = 'DRAFT' AND "signedAt" IS NULL) OR ("status" = 'SIGNED' AND "signedAt" IS NOT NULL));
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_positive_measurements_chk" CHECK (("temperatureC" IS NULL OR "temperatureC" > 0) AND ("systolicMmHg" IS NULL OR "systolicMmHg" > 0) AND ("diastolicMmHg" IS NULL OR "diastolicMmHg" > 0) AND ("pulseBpm" IS NULL OR "pulseBpm" > 0) AND ("respiratoryRatePerMin" IS NULL OR "respiratoryRatePerMin" > 0) AND ("oxygenSaturationPct" IS NULL OR ("oxygenSaturationPct" >= 0 AND "oxygenSaturationPct" <= 100)) AND ("heightCm" IS NULL OR "heightCm" > 0) AND ("weightKg" IS NULL OR "weightKg" > 0) AND ("bmi" IS NULL OR "bmi" > 0));
CREATE UNIQUE INDEX "EncounterDiagnosis_one_primary_per_encounter_uq" ON "EncounterDiagnosis" ("encounterId") WHERE "isPrimary" = TRUE;
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_positive_values_chk" CHECK (("durationDays" IS NULL OR "durationDays" > 0) AND ("quantity" IS NULL OR "quantity" > 0) AND "refills" >= 0);
ALTER TABLE "ClinicalAmendment" ADD CONSTRAINT "ClinicalAmendment_nonempty_reason_chk" CHECK (length(btrim("reason")) > 0 AND "previousContent" <> "correctedContent");
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_target_matches_type_chk" CHECK (("type" = 'INTERNAL' AND ("referredToSpecialtyId" IS NOT NULL OR "referredToDoctorId" IS NOT NULL) AND "externalFacilityName" IS NULL) OR ("type" = 'EXTERNAL' AND "externalFacilityName" IS NOT NULL AND "referredToSpecialtyId" IS NULL AND "referredToDoctorId" IS NULL));

-- Laboratory integrity.
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_price_turnaround_chk" CHECK ("price" >= 0 AND ("defaultTurnaroundMinutes" IS NULL OR "defaultTurnaroundMinutes" > 0));
ALTER TABLE "LabTestComponent" ADD CONSTRAINT "LabTestComponent_sort_order_chk" CHECK ("sortOrder" >= 0);
ALTER TABLE "LabOrderItem" ADD CONSTRAINT "LabOrderItem_price_nonnegative_chk" CHECK ("priceSnapshot" >= 0);
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_rejection_reason_chk" CHECK ("status" <> 'REJECTED' OR ("rejectionReason" IS NOT NULL AND length(btrim("rejectionReason")) > 0));
ALTER TABLE "LabResultValue" ADD CONSTRAINT "LabResultValue_single_typed_value_chk" CHECK (("valueType" = 'NUMERIC' AND "valueNumeric" IS NOT NULL AND "valueText" IS NULL AND "valueBoolean" IS NULL) OR ("valueType" = 'TEXT' AND "valueText" IS NOT NULL AND "valueNumeric" IS NULL AND "valueBoolean" IS NULL) OR ("valueType" = 'BOOLEAN' AND "valueBoolean" IS NOT NULL AND "valueNumeric" IS NULL AND "valueText" IS NULL));
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_approval_release_timestamps_chk" CHECK (("status" NOT IN ('APPROVED', 'RELEASED') OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL)) AND ("status" <> 'RELEASED' OR "releasedAt" IS NOT NULL));
ALTER TABLE "LabCriticalCommunication" ADD CONSTRAINT "LabCriticalCommunication_status_timestamps_chk" CHECK (("status" = 'PENDING' OR "notifiedAt" IS NOT NULL) AND ("status" NOT IN ('ACKNOWLEDGED', 'RESOLVED') OR ("acknowledgedByEmployeeId" IS NOT NULL AND "acknowledgedAt" IS NOT NULL)) AND ("status" <> 'ESCALATED' OR "escalatedAt" IS NOT NULL) AND ("readBackConfirmedAt" IS NULL OR "readBackRequired" = TRUE));

-- Radiology integrity and room/equipment overlap prevention.
ALTER TABLE "RadiologyProcedure" ADD CONSTRAINT "RadiologyProcedure_price_duration_chk" CHECK ("price" >= 0 AND ("defaultDurationMinutes" IS NULL OR "defaultDurationMinutes" > 0));
ALTER TABLE "RadiologyExam" ADD CONSTRAINT "RadiologyExam_schedule_pair_chk" CHECK (("scheduledStartsAt" IS NULL AND "scheduledEndsAt" IS NULL) OR ("scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL AND "scheduledEndsAt" > "scheduledStartsAt")), ADD CONSTRAINT "RadiologyExam_completed_time_chk" CHECK ("status" <> 'COMPLETED' OR "performedAt" IS NOT NULL);
ALTER TABLE "RadiologyExam" ADD CONSTRAINT "RadiologyExam_resource_no_overlap" EXCLUDE USING GIST ("resourceId" WITH =, tstzrange("scheduledStartsAt", "scheduledEndsAt", '[)') WITH &&) WHERE ("resourceId" IS NOT NULL AND "scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL AND "status" IN ('SCHEDULED', 'IN_PROGRESS'));
ALTER TABLE "RadiologyReport" ADD CONSTRAINT "RadiologyReport_approval_release_timestamps_chk" CHECK (("status" NOT IN ('APPROVED', 'RELEASED') OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL)) AND ("status" <> 'RELEASED' OR "releasedAt" IS NOT NULL));
ALTER TABLE "RadiologyCriticalCommunication" ADD CONSTRAINT "RadiologyCriticalCommunication_status_timestamps_chk" CHECK (("status" = 'PENDING' OR "notifiedAt" IS NOT NULL) AND ("status" NOT IN ('ACKNOWLEDGED', 'RESOLVED') OR ("acknowledgedByEmployeeId" IS NOT NULL AND "acknowledgedAt" IS NOT NULL)) AND ("status" <> 'ESCALATED' OR "escalatedAt" IS NOT NULL) AND ("readBackConfirmedAt" IS NULL OR "readBackRequired" = TRUE));

-- Billing integrity.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amounts_consistent_chk" CHECK ("subtotal" >= 0 AND "discountTotal" >= 0 AND "discountTotal" <= "subtotal" AND "total" = ("subtotal" - "discountTotal")), ADD CONSTRAINT "Invoice_issued_timestamp_chk" CHECK ("status" = 'DRAFT' OR "issuedAt" IS NOT NULL), ADD CONSTRAINT "Invoice_void_reason_chk" CHECK ("status" <> 'VOIDED' OR ("voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND length(btrim("voidReason")) > 0));
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_amounts_source_chk" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "discountAmount" >= 0 AND "discountAmount" <= ("unitPrice" * "quantity") AND "lineTotal" = (("unitPrice" * "quantity") - "discountAmount") AND (("sourceType" = 'SERVICE' AND "serviceCatalogId" IS NOT NULL AND "labOrderItemId" IS NULL AND "radiologyOrderItemId" IS NULL) OR ("sourceType" = 'LAB_TEST' AND "serviceCatalogId" IS NULL AND "labOrderItemId" IS NOT NULL AND "radiologyOrderItemId" IS NULL) OR ("sourceType" = 'RADIOLOGY_PROCEDURE' AND "serviceCatalogId" IS NULL AND "labOrderItemId" IS NULL AND "radiologyOrderItemId" IS NOT NULL) OR ("sourceType" = 'OTHER' AND "serviceCatalogId" IS NULL AND "labOrderItemId" IS NULL AND "radiologyOrderItemId" IS NULL)));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive_chk" CHECK ("amount" > 0), ADD CONSTRAINT "Payment_void_details_chk" CHECK (("status" = 'COMPLETED' AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR ("status" = 'VOIDED' AND "voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND length(btrim("voidReason")) > 0));
CREATE UNIQUE INDEX "Payment_one_completed_per_invoice_uq" ON "Payment" ("invoiceId") WHERE "status" = 'COMPLETED';
ALTER TABLE "DiscountApproval" ADD CONSTRAINT "DiscountApproval_amount_decision_chk" CHECK ("amount" > 0 AND ("status" NOT IN ('APPROVED', 'REJECTED') OR ("decidedByEmployeeId" IS NOT NULL AND "decidedAt" IS NOT NULL)));
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_decision_chk" CHECK ("amount" > 0 AND ("status" NOT IN ('APPROVED', 'REJECTED', 'COMPLETED') OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL)) AND ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL));
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_amount_positive_chk" CHECK ("amount" > 0);

-- Operational integrity.
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_exactly_one_owner_chk" CHECK (num_nonnulls("patientId", "encounterId", "labResultId", "radiologyReportId", "complaintId", "incidentReportId") = 1), ADD CONSTRAINT "Attachment_size_positive_chk" CHECK ("sizeBytes" > 0);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_exactly_one_recipient_chk" CHECK (num_nonnulls("patientId", "employeeId") = 1), ADD CONSTRAINT "Notification_read_timestamp_chk" CHECK ("status" <> 'READ' OR "readAt" IS NOT NULL);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_matches_type_chk" CHECK (("actorType" = 'EMPLOYEE' AND "actorEmployeeId" IS NOT NULL) OR ("actorType" IN ('SYSTEM', 'EXTERNAL') AND "actorEmployeeId" IS NULL));
`;

const advancedIntegritySql = String.raw`

-- -----------------------------------------------------------------------------
-- MERUNO Phase 2E hardening follow-up.
-- Cross-row business invariants are checked by deferred PostgreSQL triggers.
-- -----------------------------------------------------------------------------

-- A doctor's active weekly schedule rows must not overlap on the same weekday
-- during intersecting effective-date ranges and working-minute ranges.
ALTER TABLE "DoctorWeeklySchedule"
  ADD CONSTRAINT "DoctorWeeklySchedule_no_overlap"
  EXCLUDE USING GIST (
    "doctorId" WITH =,
    "weekday" WITH =,
    daterange("effectiveFrom", "effectiveUntil", '[]') WITH &&,
    int4range("startMinuteOfDay", "endMinuteOfDay", '[)') WITH &&
  ) WHERE ("isActive" = TRUE);

-- Allow a history of discount requests, but only one unresolved request at a time.
CREATE UNIQUE INDEX "DiscountApproval_one_pending_per_invoice_uq"
  ON "DiscountApproval" ("invoiceId") WHERE "status" = 'PENDING';

-- Payment must be a single full payment in the invoice currency. The existing
-- partial unique index separately guarantees at most one completed payment.
CREATE OR REPLACE FUNCTION meruno_validate_completed_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_total numeric(10,2);
  v_invoice_currency char(3);
  v_invoice_status "InvoiceStatus";
BEGIN
  IF NEW."status" = 'COMPLETED' THEN
    SELECT "total", "currencyCode", "status"
      INTO v_invoice_total, v_invoice_currency, v_invoice_status
      FROM "Invoice"
      WHERE "id" = NEW."invoiceId"
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment invoice % does not exist', NEW."invoiceId"
        USING ERRCODE = '23503';
    END IF;

    IF v_invoice_status IN ('DRAFT', 'VOIDED') THEN
      RAISE EXCEPTION 'A completed payment requires an issued, non-voided invoice (%).', NEW."invoiceId"
        USING ERRCODE = '23514';
    END IF;

    IF NEW."amount" <> v_invoice_total THEN
      RAISE EXCEPTION 'Partial or overpayment is not allowed: payment amount % must equal invoice total %.', NEW."amount", v_invoice_total
        USING ERRCODE = '23514';
    END IF;

    IF NEW."currencyCode" <> v_invoice_currency THEN
      RAISE EXCEPTION 'Payment currency must match invoice currency for invoice %.', NEW."invoiceId"
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Payment_validate_full_payment_trg"
  BEFORE INSERT OR UPDATE OF "invoiceId", "amount", "currencyCode", "status"
  ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION meruno_validate_completed_payment();

-- Keep invoice/payment/refund state consistent even if invoice totals or a
-- previously completed payment are edited after the original payment action.
CREATE OR REPLACE FUNCTION meruno_assert_payment_refund_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_invoice_total numeric(10,2);
  v_invoice_currency char(3);
  v_invoice_status "InvoiceStatus";
  v_payment_count bigint;
  v_payment_amount numeric(10,2);
  v_payment_currency char(3);
  v_completed_refund_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'Payment' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  ELSIF TG_TABLE_NAME = 'Refund' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT "total", "currencyCode", "status"
      INTO v_invoice_total, v_invoice_currency, v_invoice_status
      FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;

    IF FOUND THEN
      SELECT COUNT(*) FILTER (WHERE "status" = 'COMPLETED'),
             COALESCE(MAX("amount") FILTER (WHERE "status" = 'COMPLETED'), 0),
             MAX("currencyCode") FILTER (WHERE "status" = 'COMPLETED')
        INTO v_payment_count, v_payment_amount, v_payment_currency
        FROM "Payment" WHERE "invoiceId" = v_invoice_id;

      SELECT COALESCE(SUM("amount"), 0)
        INTO v_completed_refund_total
        FROM "Refund"
        WHERE "invoiceId" = v_invoice_id AND "status" = 'COMPLETED';

      IF v_payment_count > 1 THEN
        RAISE EXCEPTION 'An invoice can have only one completed full payment (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 1 AND (v_payment_amount <> v_invoice_total OR v_payment_currency <> v_invoice_currency) THEN
        RAISE EXCEPTION 'A completed payment must continue to match the invoice total and currency (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 1 AND v_invoice_status IN ('DRAFT', 'ISSUED', 'VOIDED') THEN
        RAISE EXCEPTION 'An invoice with a completed payment must be in PAID or a refunded state (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 0 AND v_invoice_status IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
        RAISE EXCEPTION 'A paid/refunded invoice must have a completed full payment (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 0 AND EXISTS (
        SELECT 1 FROM "Refund"
        WHERE "invoiceId" = v_invoice_id AND "status" IN ('PENDING', 'APPROVED', 'COMPLETED')
      ) THEN
        RAISE EXCEPTION 'Active refund requests require a completed full payment (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_invoice_status = 'PAID' AND v_completed_refund_total <> 0 THEN
        RAISE EXCEPTION 'An invoice with completed refunds cannot remain in PAID state (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      ELSIF v_invoice_status = 'PARTIALLY_REFUNDED'
        AND NOT (v_completed_refund_total > 0 AND v_completed_refund_total < v_invoice_total) THEN
        RAISE EXCEPTION 'PARTIALLY_REFUNDED requires a positive completed refund below the invoice total (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      ELSIF v_invoice_status = 'REFUNDED' AND v_completed_refund_total <> v_invoice_total THEN
        RAISE EXCEPTION 'REFUNDED requires completed refunds equal to the invoice total (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      ELSIF v_invoice_status IN ('DRAFT', 'ISSUED', 'VOIDED') AND v_completed_refund_total <> 0 THEN
        RAISE EXCEPTION 'Completed refunds require a paid/refunded invoice state (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_payment_refund_state_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_payment_refund_state();

CREATE CONSTRAINT TRIGGER "Payment_invoice_state_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Payment"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_payment_refund_state();

CREATE CONSTRAINT TRIGGER "Refund_invoice_state_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Refund"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_payment_refund_state();

-- Reconcile invoice header values against all invoice lines at transaction end.
-- Accounting convention: subtotal is gross, discountTotal is the sum of line
-- discounts, and total is the sum of net line totals.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_subtotal numeric(10,2);
  v_discount_total numeric(10,2);
  v_total numeric(10,2);
  v_currency char(3);
  v_lines_subtotal numeric(10,2);
  v_lines_discount numeric(10,2);
  v_lines_total numeric(10,2);
  v_currency_mismatches bigint;
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT "subtotal", "discountTotal", "total", "currencyCode"
      INTO v_subtotal, v_discount_total, v_total, v_currency
      FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(SUM("unitPrice" * "quantity"), 0),
             COALESCE(SUM("discountAmount"), 0),
             COALESCE(SUM("lineTotal"), 0),
             COUNT(*) FILTER (WHERE "currencyCode" <> v_currency)
        INTO v_lines_subtotal, v_lines_discount, v_lines_total, v_currency_mismatches
        FROM "InvoiceItem" WHERE "invoiceId" = v_invoice_id;

      IF v_currency_mismatches > 0 THEN
        RAISE EXCEPTION 'Every invoice item must use the invoice currency (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_subtotal <> v_lines_subtotal THEN
        RAISE EXCEPTION 'Invoice subtotal % must equal gross invoice item amounts % (invoice %).', v_subtotal, v_lines_subtotal, v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_discount_total <> v_lines_discount THEN
        RAISE EXCEPTION 'Invoice discount total % must equal invoice item discounts % (invoice %).', v_discount_total, v_lines_discount, v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_total <> v_lines_total OR v_total <> (v_subtotal - v_discount_total) THEN
        RAISE EXCEPTION 'Invoice total must equal both the sum of net line totals and subtotal minus discounts (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_totals_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_totals();

CREATE CONSTRAINT TRIGGER "InvoiceItem_totals_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_totals();

-- Applied discounts may not exceed the sum of explicitly approved discounts.
-- The invoice row lock serializes concurrent invoice/approval changes.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_discount_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_subtotal numeric(10,2);
  v_discount_total numeric(10,2);
  v_approved_discount numeric(10,2);
  v_requested_discount numeric(10,2);
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'DiscountApproval' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT "subtotal", "discountTotal"
      INTO v_subtotal, v_discount_total
      FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(SUM("amount") FILTER (WHERE "status" = 'APPROVED'), 0),
             COALESCE(MAX("amount") FILTER (WHERE "status" IN ('PENDING', 'APPROVED')), 0)
        INTO v_approved_discount, v_requested_discount
        FROM "DiscountApproval" WHERE "invoiceId" = v_invoice_id;

      IF v_requested_discount > v_subtotal THEN
        RAISE EXCEPTION 'A requested discount cannot exceed invoice subtotal (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_approved_discount > v_subtotal THEN
        RAISE EXCEPTION 'Total approved discounts cannot exceed invoice subtotal (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_discount_total > v_approved_discount THEN
        RAISE EXCEPTION 'Applied invoice discounts cannot exceed the total approved discount amount (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_discount_approval_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_discount_approval();

CREATE CONSTRAINT TRIGGER "DiscountApproval_invoice_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "DiscountApproval"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_discount_approval();

-- An invoice must belong to the same patient as its encounter. Run at commit so
-- an invoice and its encounter can be created or updated atomically.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_encounter_patient()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_invoice_patient_id text;
  v_encounter_patient_id text;
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'Encounter' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT "id" INTO v_invoice_id FROM "Invoice" WHERE "encounterId" = OLD."id";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT "id" INTO v_invoice_id FROM "Invoice" WHERE "encounterId" = NEW."id";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT i."patientId", e."patientId"
      INTO v_invoice_patient_id, v_encounter_patient_id
      FROM "Invoice" i
      JOIN "Encounter" e ON e."id" = i."encounterId"
      WHERE i."id" = v_invoice_id;

    IF FOUND AND v_invoice_patient_id <> v_encounter_patient_id THEN
      RAISE EXCEPTION 'Invoice patient must match encounter patient (invoice %).', v_invoice_id
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_encounter_patient_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_encounter_patient();

CREATE CONSTRAINT TRIGGER "Encounter_invoice_patient_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Encounter"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_encounter_patient();

-- Diagnostic invoice items must originate from the same encounter as the invoice.
-- Service-catalog items are encounter-scoped by their parent invoice; laboratory
-- and radiology items additionally validate their source order's encounter.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_item_source_encounter()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_ids text[] := ARRAY[]::text[];
  v_item_id text;
BEGIN
  IF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN v_item_ids := array_append(v_item_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_item_ids := array_append(v_item_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'LabOrderItem' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."labOrderItemId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."labOrderItemId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'LabOrder' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "LabOrderItem" loi JOIN "InvoiceItem" ii ON ii."labOrderItemId" = loi."id"
        WHERE loi."labOrderId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "LabOrderItem" loi JOIN "InvoiceItem" ii ON ii."labOrderItemId" = loi."id"
        WHERE loi."labOrderId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyOrderItem' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."radiologyOrderItemId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."radiologyOrderItemId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyOrder' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "RadiologyOrderItem" roi JOIN "InvoiceItem" ii ON ii."radiologyOrderItemId" = roi."id"
        WHERE roi."radiologyOrderId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "RadiologyOrderItem" roi JOIN "InvoiceItem" ii ON ii."radiologyOrderItemId" = roi."id"
        WHERE roi."radiologyOrderId" = NEW."id";
    END IF;
  END IF;

  FOREACH v_item_id IN ARRAY v_item_ids LOOP
    IF EXISTS (
      SELECT 1
      FROM "InvoiceItem" ii
      JOIN "Invoice" inv ON inv."id" = ii."invoiceId"
      JOIN "LabOrderItem" loi ON loi."id" = ii."labOrderItemId"
      JOIN "LabOrder" lo ON lo."id" = loi."labOrderId"
      WHERE ii."id" = v_item_id
        AND ii."sourceType" = 'LAB_TEST'
        AND lo."encounterId" <> inv."encounterId"
    ) THEN
      RAISE EXCEPTION 'A laboratory invoice item must belong to the invoice encounter (item %).', v_item_id
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "InvoiceItem" ii
      JOIN "Invoice" inv ON inv."id" = ii."invoiceId"
      JOIN "RadiologyOrderItem" roi ON roi."id" = ii."radiologyOrderItemId"
      JOIN "RadiologyOrder" ro ON ro."id" = roi."radiologyOrderId"
      WHERE ii."id" = v_item_id
        AND ii."sourceType" = 'RADIOLOGY_PROCEDURE'
        AND ro."encounterId" <> inv."encounterId"
    ) THEN
      RAISE EXCEPTION 'A radiology invoice item must belong to the invoice encounter (item %).', v_item_id
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "InvoiceItem_source_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "LabOrderItem_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "LabOrderItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "LabOrder_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "LabOrder"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "RadiologyOrderItem_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "RadiologyOrderItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "RadiologyOrder_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "RadiologyOrder"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

-- Radiology exams marked scheduled/in-progress must have a resource and a full
-- time slot. Completed exams must retain performer and performance timestamp.
ALTER TABLE "RadiologyExam"
  ADD CONSTRAINT "RadiologyExam_workflow_requirements_chk"
  CHECK (
    ("status" = 'SCHEDULED' AND "resourceId" IS NOT NULL AND "scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL)
    OR ("status" = 'IN_PROGRESS' AND "resourceId" IS NOT NULL AND "scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL AND "startedAt" IS NOT NULL)
    OR ("status" = 'COMPLETED' AND "resourceId" IS NOT NULL AND "performedAt" IS NOT NULL AND "performedByEmployeeId" IS NOT NULL)
    OR "status" = 'CANCELLED'
  );

-- The assigned resource modality must match the requested procedure modality.
-- Deferred checks cover changes to either side of the relationship.
CREATE OR REPLACE FUNCTION meruno_assert_radiology_modality()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_exam_ids text[] := ARRAY[]::text[];
  v_exam_id text;
  v_procedure_modality "RadiologyModality";
  v_resource_modality "RadiologyModality";
  v_resource_id text;
BEGIN
  IF TG_TABLE_NAME = 'RadiologyExam' THEN
    IF TG_OP <> 'DELETE' THEN v_exam_ids := array_append(v_exam_ids, NEW."id"); END IF;
    IF TG_OP <> 'INSERT' THEN v_exam_ids := array_append(v_exam_ids, OLD."id"); END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyOrderItem' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT "id" INTO v_exam_id FROM "RadiologyExam" WHERE "orderItemId" = NEW."id";
      IF FOUND THEN v_exam_ids := array_append(v_exam_ids, v_exam_id); END IF;
    END IF;
    IF TG_OP <> 'INSERT' THEN
      SELECT "id" INTO v_exam_id FROM "RadiologyExam" WHERE "orderItemId" = OLD."id";
      IF FOUND THEN v_exam_ids := array_append(v_exam_ids, v_exam_id); END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyProcedure' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT COALESCE(array_agg(e."id"), ARRAY[]::text[]) INTO v_exam_ids
        FROM "RadiologyExam" e JOIN "RadiologyOrderItem" oi ON oi."id" = e."orderItemId"
        WHERE oi."procedureId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyResource' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT COALESCE(array_agg(e."id"), ARRAY[]::text[]) INTO v_exam_ids
        FROM "RadiologyExam" e WHERE e."resourceId" = NEW."id";
    END IF;
  END IF;

  FOREACH v_exam_id IN ARRAY v_exam_ids LOOP
    SELECT p."modality", r."modality", e."resourceId"
      INTO v_procedure_modality, v_resource_modality, v_resource_id
      FROM "RadiologyExam" e
      JOIN "RadiologyOrderItem" oi ON oi."id" = e."orderItemId"
      JOIN "RadiologyProcedure" p ON p."id" = oi."procedureId"
      LEFT JOIN "RadiologyResource" r ON r."id" = e."resourceId"
      WHERE e."id" = v_exam_id;

    IF FOUND AND v_resource_id IS NOT NULL AND v_procedure_modality <> v_resource_modality THEN
      RAISE EXCEPTION 'Radiology resource modality must match procedure modality (exam %).', v_exam_id
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "RadiologyExam_modality_deferred_trg"
  AFTER INSERT OR UPDATE ON "RadiologyExam"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

CREATE CONSTRAINT TRIGGER "RadiologyOrderItem_modality_deferred_trg"
  AFTER INSERT OR UPDATE ON "RadiologyOrderItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

CREATE CONSTRAINT TRIGGER "RadiologyProcedure_modality_deferred_trg"
  AFTER UPDATE ON "RadiologyProcedure"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

CREATE CONSTRAINT TRIGGER "RadiologyResource_modality_deferred_trg"
  AFTER UPDATE ON "RadiologyResource"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

-- Serialize invoice-item and refund operations by locking their invoice rows
-- before deferred reconciliation and balance checks run.
CREATE OR REPLACE FUNCTION meruno_lock_invoice_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
BEGIN
  IF TG_TABLE_NAME = 'Refund' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  ELSIF TG_TABLE_NAME = 'RefundItem' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT "invoiceId" INTO v_invoice_id FROM "Refund" WHERE "id" = OLD."refundId";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT "invoiceId" INTO v_invoice_id FROM "Refund" WHERE "id" = NEW."refundId";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOR v_invoice_id IN
    SELECT DISTINCT u.invoice_id
      FROM unnest(v_invoice_ids) AS u(invoice_id)
      WHERE u.invoice_id IS NOT NULL
      ORDER BY u.invoice_id
  LOOP
    PERFORM 1 FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Refund_lock_invoice_trg"
  BEFORE INSERT OR UPDATE OR DELETE ON "Refund"
  FOR EACH ROW EXECUTE FUNCTION meruno_lock_invoice_integrity();

CREATE TRIGGER "RefundItem_lock_invoice_trg"
  BEFORE INSERT OR UPDATE OR DELETE ON "RefundItem"
  FOR EACH ROW EXECUTE FUNCTION meruno_lock_invoice_integrity();

CREATE TRIGGER "InvoiceItem_lock_invoice_integrity_trg"
  BEFORE INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  FOR EACH ROW EXECUTE FUNCTION meruno_lock_invoice_integrity();

-- Validate refund-to-invoice ownership, refund header/item reconciliation,
-- currency consistency, and outstanding refund caps per line and invoice.
CREATE OR REPLACE FUNCTION meruno_assert_refund_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_refund_ids text[] := ARRAY[]::text[];
  v_invoice_item_ids text[] := ARRAY[]::text[];
  v_invoice_ids text[] := ARRAY[]::text[];
  v_id text;
  v_refund_invoice_id text;
  v_refund_amount numeric(10,2);
  v_refund_currency char(3);
  v_refund_status "RefundStatus";
  v_items_total numeric;
  v_item_invoice_id text;
  v_item_limit numeric(10,2);
  v_invoice_total numeric(10,2);
  v_invoice_currency char(3);
  v_active_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'Refund' THEN
    IF TG_OP <> 'INSERT' THEN
      v_refund_ids := array_append(v_refund_ids, OLD."id");
      v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId");
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_refund_ids := array_append(v_refund_ids, NEW."id");
      v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId");
    END IF;
  ELSIF TG_TABLE_NAME = 'RefundItem' THEN
    IF TG_OP <> 'INSERT' THEN
      v_refund_ids := array_append(v_refund_ids, OLD."refundId");
      v_invoice_item_ids := array_append(v_invoice_item_ids, OLD."invoiceItemId");
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_refund_ids := array_append(v_refund_ids, NEW."refundId");
      v_invoice_item_ids := array_append(v_invoice_item_ids, NEW."invoiceItemId");
    END IF;
  ELSIF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN
      v_invoice_item_ids := array_append(v_invoice_item_ids, OLD."id");
      v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId");
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_invoice_item_ids := array_append(v_invoice_item_ids, NEW."id");
      v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId");
    END IF;
  ELSIF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  END IF;

  IF cardinality(v_invoice_item_ids) > 0 THEN
    SELECT v_refund_ids || COALESCE(array_agg(DISTINCT ri."refundId"), ARRAY[]::text[])
      INTO v_refund_ids
      FROM "RefundItem" ri
      WHERE ri."invoiceItemId" = ANY(v_invoice_item_ids);
  END IF;

  IF cardinality(v_refund_ids) > 0 THEN
    SELECT v_invoice_ids || COALESCE(array_agg(DISTINCT r."invoiceId"), ARRAY[]::text[])
      INTO v_invoice_ids
      FROM "Refund" r WHERE r."id" = ANY(v_refund_ids);
  END IF;

  IF cardinality(v_invoice_item_ids) > 0 THEN
    SELECT v_invoice_ids || COALESCE(array_agg(DISTINCT ii."invoiceId"), ARRAY[]::text[])
      INTO v_invoice_ids
      FROM "InvoiceItem" ii WHERE ii."id" = ANY(v_invoice_item_ids);
  END IF;

  FOREACH v_id IN ARRAY v_refund_ids LOOP
    SELECT "invoiceId", "amount", "currencyCode", "status"
      INTO v_refund_invoice_id, v_refund_amount, v_refund_currency, v_refund_status
      FROM "Refund" WHERE "id" = v_id;

    IF FOUND THEN
      SELECT COALESCE(SUM("amount"), 0) INTO v_items_total
        FROM "RefundItem" WHERE "refundId" = v_id;

      IF v_items_total <> v_refund_amount THEN
        RAISE EXCEPTION 'Refund amount must equal the sum of its refund items (refund %).', v_id
          USING ERRCODE = '23514';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM "RefundItem" ri
        JOIN "InvoiceItem" ii ON ii."id" = ri."invoiceItemId"
        JOIN "Invoice" inv ON inv."id" = ii."invoiceId"
        WHERE ri."refundId" = v_id
          AND (ii."invoiceId" <> v_refund_invoice_id
               OR ii."currencyCode" <> v_refund_currency
               OR inv."currencyCode" <> v_refund_currency)
      ) THEN
        RAISE EXCEPTION 'Every refund item must belong to the refund invoice and use its currency (refund %).', v_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  FOREACH v_id IN ARRAY v_invoice_item_ids LOOP
    SELECT "invoiceId", "lineTotal" INTO v_item_invoice_id, v_item_limit
      FROM "InvoiceItem" WHERE "id" = v_id;

    IF FOUND THEN
      SELECT COALESCE(SUM(ri."amount"), 0) INTO v_active_total
        FROM "RefundItem" ri
        JOIN "Refund" r ON r."id" = ri."refundId"
        WHERE ri."invoiceItemId" = v_id
          AND r."status" IN ('PENDING', 'APPROVED', 'COMPLETED');

      IF v_active_total > v_item_limit THEN
        RAISE EXCEPTION 'Active refunds cannot exceed the invoice item line total (invoice item %).', v_id
          USING ERRCODE = '23514';
      END IF;

      v_invoice_ids := array_append(v_invoice_ids, v_item_invoice_id);
    END IF;
  END LOOP;

  FOREACH v_id IN ARRAY v_invoice_ids LOOP
    SELECT "total", "currencyCode" INTO v_invoice_total, v_invoice_currency
      FROM "Invoice" WHERE "id" = v_id FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(SUM("amount"), 0) INTO v_active_total
        FROM "Refund"
        WHERE "invoiceId" = v_id
          AND "status" IN ('PENDING', 'APPROVED', 'COMPLETED');

      IF v_active_total > v_invoice_total THEN
        RAISE EXCEPTION 'Active refunds cannot exceed the invoice total (invoice %).', v_id
          USING ERRCODE = '23514';
      END IF;

      IF v_active_total > 0 AND NOT EXISTS (
        SELECT 1 FROM "Payment"
        WHERE "invoiceId" = v_id AND "status" = 'COMPLETED'
      ) THEN
        RAISE EXCEPTION 'Refund requests require a completed full payment (invoice %).', v_id
          USING ERRCODE = '23514';
      END IF;

      IF EXISTS (
        SELECT 1 FROM "Refund" r
        WHERE r."invoiceId" = v_id
          AND r."status" IN ('PENDING', 'APPROVED', 'COMPLETED')
          AND r."currencyCode" <> v_invoice_currency
      ) THEN
        RAISE EXCEPTION 'Refund currency must match invoice currency (invoice %).', v_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Refund_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Refund"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();

CREATE CONSTRAINT TRIGGER "RefundItem_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "RefundItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();

CREATE CONSTRAINT TRIGGER "InvoiceItem_refund_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();

CREATE CONSTRAINT TRIGGER "Invoice_refund_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();
`;

mkdirSync(migrationDirectory, { recursive: true });
writeFileSync(migrationFile, `${generatedSql}\n${customSql}\n${advancedIntegritySql}`, "utf8");
mkdirSync(migrationsPath, { recursive: true });
if (!existsSync(lockFile)) writeFileSync(lockFile, 'provider = "postgresql"\n', "utf8");

console.log(`Created: ${resolve(migrationFile)}`);
console.log("The migration is a draft only. PostgreSQL was NOT modified.");
console.log("Review the SQL before applying it with Prisma Migrate.");
