-- MERUNO Update 66 — additive nursing task and vital-sign workflow.
-- Historical VitalSign records remain unchanged; their nursingTaskId is NULL.

CREATE TYPE "NursingTaskType" AS ENUM (
  'RECORD_VITAL_SIGNS',
  'REPEAT_VITAL_SIGNS',
  'PRE_CONSULTATION_ASSESSMENT',
  'PROCEDURE_PREPARATION',
  'OTHER'
);

CREATE TYPE "NursingTaskStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'ESCALATED',
  'CANCELLED'
);

CREATE TABLE "NursingTask" (
  "id" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "assignedToEmployeeId" TEXT NOT NULL,
  "createdByEmployeeId" TEXT NOT NULL,
  "taskType" "NursingTaskType" NOT NULL,
  "status" "NursingTaskStatus" NOT NULL DEFAULT 'PENDING',
  "instructions" TEXT,
  "dueAt" TIMESTAMPTZ(3),
  "startedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "completedByEmployeeId" TEXT,
  "cancelledAt" TIMESTAMPTZ(3),
  "cancelledByEmployeeId" TEXT,
  "cancellationNote" VARCHAR(1000),
  "escalatedAt" TIMESTAMPTZ(3),
  "escalationNote" VARCHAR(1000),
  "escalationResolvedAt" TIMESTAMPTZ(3),
  "escalationResolvedByEmployeeId" TEXT,
  "escalationResolutionNote" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "NursingTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NursingTask_status_timestamps_check" CHECK (
    ("status" <> 'PENDING' OR ("startedAt" IS NULL AND "completedAt" IS NULL AND "completedByEmployeeId" IS NULL AND "cancelledAt" IS NULL AND "cancelledByEmployeeId" IS NULL AND "cancellationNote" IS NULL AND "escalatedAt" IS NULL AND "escalationNote" IS NULL AND "escalationResolvedAt" IS NULL AND "escalationResolvedByEmployeeId" IS NULL AND "escalationResolutionNote" IS NULL)) AND
    ("status" <> 'IN_PROGRESS' OR ("startedAt" IS NOT NULL AND "completedAt" IS NULL AND "completedByEmployeeId" IS NULL AND "cancelledAt" IS NULL AND "cancelledByEmployeeId" IS NULL AND "cancellationNote" IS NULL)) AND
    ("status" <> 'COMPLETED' OR ("startedAt" IS NOT NULL AND "completedAt" IS NOT NULL AND "completedByEmployeeId" IS NOT NULL AND "cancelledAt" IS NULL AND "cancelledByEmployeeId" IS NULL AND "cancellationNote" IS NULL)) AND
    ("status" <> 'CANCELLED' OR ("cancelledAt" IS NOT NULL AND "cancelledByEmployeeId" IS NOT NULL AND "cancellationNote" IS NOT NULL AND length(btrim("cancellationNote")) > 0 AND "completedAt" IS NULL AND "completedByEmployeeId" IS NULL)) AND
    ("status" <> 'ESCALATED' OR ("startedAt" IS NOT NULL AND "escalatedAt" IS NOT NULL AND "escalationNote" IS NOT NULL AND length(btrim("escalationNote")) > 0 AND "completedAt" IS NULL AND "completedByEmployeeId" IS NULL AND "cancelledAt" IS NULL AND "cancelledByEmployeeId" IS NULL AND "cancellationNote" IS NULL AND "escalationResolvedAt" IS NULL AND "escalationResolvedByEmployeeId" IS NULL AND "escalationResolutionNote" IS NULL))
  ),
  CONSTRAINT "NursingTask_escalation_resolution_check" CHECK (
    ("escalationResolvedAt" IS NULL AND "escalationResolvedByEmployeeId" IS NULL AND "escalationResolutionNote" IS NULL)
    OR ("escalatedAt" IS NOT NULL AND "escalationResolvedAt" IS NOT NULL AND "escalationResolvedByEmployeeId" IS NOT NULL AND "escalationResolutionNote" IS NOT NULL AND length(btrim("escalationResolutionNote")) > 0)
  )
);

ALTER TABLE "VitalSign" ADD COLUMN "nursingTaskId" TEXT;

CREATE INDEX "NursingTask_assignedToEmployeeId_status_dueAt_createdAt_idx"
  ON "NursingTask"("assignedToEmployeeId", "status", "dueAt", "createdAt");
CREATE INDEX "NursingTask_encounterId_status_createdAt_idx"
  ON "NursingTask"("encounterId", "status", "createdAt");
CREATE INDEX "NursingTask_createdByEmployeeId_createdAt_idx"
  ON "NursingTask"("createdByEmployeeId", "createdAt");
CREATE INDEX "VitalSign_nursingTaskId_measuredAt_idx"
  ON "VitalSign"("nursingTaskId", "measuredAt");

ALTER TABLE "NursingTask"
  ADD CONSTRAINT "NursingTask_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingTask"
  ADD CONSTRAINT "NursingTask_assignedToEmployeeId_fkey"
  FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingTask"
  ADD CONSTRAINT "NursingTask_createdByEmployeeId_fkey"
  FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingTask"
  ADD CONSTRAINT "NursingTask_completedByEmployeeId_fkey"
  FOREIGN KEY ("completedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingTask"
  ADD CONSTRAINT "NursingTask_cancelledByEmployeeId_fkey"
  FOREIGN KEY ("cancelledByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NursingTask"
  ADD CONSTRAINT "NursingTask_escalationResolvedByEmployeeId_fkey"
  FOREIGN KEY ("escalationResolvedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VitalSign"
  ADD CONSTRAINT "VitalSign_nursingTaskId_fkey"
  FOREIGN KEY ("nursingTaskId") REFERENCES "NursingTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Historical rows are intentionally not backfilled or rewritten.
