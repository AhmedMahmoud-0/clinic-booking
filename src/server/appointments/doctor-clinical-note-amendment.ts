import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { decideDoctorClinicalNoteAmendment } from "./doctor-clinical-note-amendment-policy";
import type { DoctorClinicalNoteAmendmentRequest } from "./doctor-clinical-note-amendment-validation";

export class DoctorClinicalNoteAmendmentError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorClinicalNoteAmendmentError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

type ClinicalNoteSnapshot = {
  version: 1;
  chiefComplaint: string;
  historyOfPresentIllness: string | null;
  clinicalExamination: string | null;
  assessment: string | null;
  treatmentPlan: string | null;
};

function amendmentError(code: string, message: string, status: number): never {
  throw new DoctorClinicalNoteAmendmentError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const employeeSelect = {
  id: true,
  status: true,
  roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
  doctorProfile: { select: { id: true } },
} satisfies Prisma.EmployeeSelect;

type EmployeeSource = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

const encounterSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  appointmentId: true,
  queueEntryId: true,
  status: true,
  completedAt: true,
  chiefComplaint: true,
  appointment: { select: { id: true, patientId: true, doctorId: true, status: true } },
  queueEntry: {
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      appointmentId: true,
      type: true,
      status: true,
      serviceStartedAt: true,
      completedAt: true,
    },
  },
} satisfies Prisma.EncounterSelect;

type EncounterSource = Prisma.EncounterGetPayload<{ select: typeof encounterSelect }>;

const noteSelect = {
  id: true,
  type: true,
  status: true,
  subjective: true,
  objective: true,
  assessment: true,
  plan: true,
  authorEmployeeId: true,
  signedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClinicalNoteSelect;

type ClinicalNoteSource = Prisma.ClinicalNoteGetPayload<{ select: typeof noteSelect }>;

const amendmentSelect = {
  id: true,
  previousContent: true,
  correctedContent: true,
  reason: true,
  createdByEmployeeId: true,
  createdAt: true,
} satisfies Prisma.ClinicalAmendmentSelect;

type AmendmentSource = Prisma.ClinicalAmendmentGetPayload<{ select: typeof amendmentSelect }>;

function isConsistentEncounterOrigin(encounter: EncounterSource): boolean {
  if (encounter.status === "IN_PROGRESS" && encounter.completedAt !== null) return false;
  if (encounter.status === "COMPLETED" && encounter.completedAt === null) return false;
  if (encounter.status !== "IN_PROGRESS" && encounter.status !== "COMPLETED") return false;

  if (encounter.appointmentId !== null && encounter.queueEntryId === null) {
    const expectedAppointmentStatus = encounter.status === "COMPLETED" ? "COMPLETED" : "IN_CONSULTATION";
    return encounter.appointment !== null
      && encounter.appointment.id === encounter.appointmentId
      && encounter.appointment.patientId === encounter.patientId
      && encounter.appointment.doctorId === encounter.doctorId
      && encounter.appointment.status === expectedAppointmentStatus
      && encounter.queueEntry === null;
  }

  if (encounter.appointmentId === null && encounter.queueEntryId !== null) {
    const expectedQueueStatus = encounter.status === "COMPLETED" ? "COMPLETED" : "IN_SERVICE";
    return encounter.appointment === null
      && encounter.queueEntry !== null
      && encounter.queueEntry.id === encounter.queueEntryId
      && encounter.queueEntry.patientId === encounter.patientId
      && encounter.queueEntry.doctorId === encounter.doctorId
      && encounter.queueEntry.appointmentId === null
      && encounter.queueEntry.type === "WALK_IN"
      && encounter.queueEntry.status === expectedQueueStatus
      && encounter.queueEntry.serviceStartedAt !== null
      && (encounter.status !== "COMPLETED" || encounter.queueEntry.completedAt !== null);
  }

  return false;
}

function originalSnapshot(encounter: EncounterSource, note: ClinicalNoteSource): ClinicalNoteSnapshot {
  const chiefComplaint = encounter.chiefComplaint;
  if (!chiefComplaint?.trim()) {
    amendmentError("INITIAL_NOTE_CONTENT_INCOMPLETE", "The signed note has no persisted chief complaint. No amendment was created.", 409);
  }
  return {
    version: 1,
    chiefComplaint,
    historyOfPresentIllness: note.subjective,
    clinicalExamination: note.objective,
    assessment: note.assessment,
    treatmentPlan: note.plan,
  };
}

function parseSnapshot(value: string): ClinicalNoteSnapshot | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const allowedKeys = [
    "version",
    "chiefComplaint",
    "historyOfPresentIllness",
    "clinicalExamination",
    "assessment",
    "treatmentPlan",
  ];
  if (Object.keys(record).length !== allowedKeys.length || Object.keys(record).some((key) => !allowedKeys.includes(key))) return null;
  if (
    record.version !== 1
    || typeof record.chiefComplaint !== "string"
    || !record.chiefComplaint.trim()
    || record.chiefComplaint.length > 2_000
  ) return null;
  const optionalKeys = ["historyOfPresentIllness", "clinicalExamination", "assessment", "treatmentPlan"] as const;
  for (const key of optionalKeys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) return null;
    const field = record[key];
    if (field !== null && (typeof field !== "string" || field.length > 10_000)) return null;
  }
  return {
    version: 1,
    chiefComplaint: record.chiefComplaint,
    historyOfPresentIllness: record.historyOfPresentIllness as string | null,
    clinicalExamination: record.clinicalExamination as string | null,
    assessment: record.assessment as string | null,
    treatmentPlan: record.treatmentPlan as string | null,
  };
}

function serializeSnapshot(snapshot: ClinicalNoteSnapshot): string {
  return JSON.stringify({
    version: 1,
    chiefComplaint: snapshot.chiefComplaint,
    historyOfPresentIllness: snapshot.historyOfPresentIllness,
    clinicalExamination: snapshot.clinicalExamination,
    assessment: snapshot.assessment,
    treatmentPlan: snapshot.treatmentPlan,
  });
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function hasClinicalContent(snapshot: ClinicalNoteSnapshot): boolean {
  return [
    snapshot.historyOfPresentIllness,
    snapshot.clinicalExamination,
    snapshot.assessment,
    snapshot.treatmentPlan,
  ].some((value) => Boolean(value?.trim()));
}

function mapRejection(code: string): never {
  const errors: Record<string, { message: string; status: number }> = {
    DOCTOR_WORKSPACE_ACCESS_REQUIRED: { message: "An active Doctor employee assignment is required to amend this note.", status: 403 },
    DOCTOR_PROFILE_REQUIRED: { message: "The active Doctor employee does not have a linked Doctor profile.", status: 403 },
    ENCOUNTER_NOT_FOUND: { message: "The Encounter was not found for the authenticated Doctor.", status: 404 },
    ENCOUNTER_NOT_AMENDABLE: { message: "Only an in-progress or completed Encounter can have a signed note amendment.", status: 409 },
    ENCOUNTER_SOURCE_INCONSISTENT: { message: "The Encounter lifecycle or visit source is inconsistent. No amendment was created.", status: 409 },
    INITIAL_NOTE_MISSING: { message: "No initial assessment note exists for this Encounter.", status: 409 },
    INITIAL_NOTE_AMBIGUOUS: { message: "More than one initial assessment note exists. No amendment was created.", status: 409 },
    INITIAL_NOTE_NOT_SIGNED: { message: "Only a signed initial assessment can be amended.", status: 409 },
    INITIAL_NOTE_STATE_INCONSISTENT: { message: "The initial assessment signature state is inconsistent. No amendment was created.", status: 409 },
    INITIAL_NOTE_AUTHOR_MISMATCH: { message: "Only the Doctor who originally authored and signed this note may amend it.", status: 403 },
  };
  const error = errors[code] ?? { message: "The clinical note cannot be amended in its current state.", status: 409 };
  amendmentError(code, error.message, error.status);
}

async function loadAuthorizedContext(
  transaction: Transaction,
  encounterId: string,
  actorEmployeeId: string,
  shouldLock: boolean,
) {
  if (shouldLock) {
    const encounterLock = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
    `;
    if (encounterLock.length !== 1) {
      amendmentError("ENCOUNTER_NOT_FOUND", "The Encounter was not found for the authenticated Doctor.", 404);
    }
    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "ClinicalNote"
      WHERE "encounterId" = ${encounterId} AND "type" = 'INITIAL_ASSESSMENT'
      FOR UPDATE
    `;
  }

  const employee: EmployeeSource | null = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: employeeSelect,
  });
  const encounter = await transaction.encounter.findUnique({ where: { id: encounterId }, select: encounterSelect });
  const notes = await transaction.clinicalNote.findMany({
    where: { encounterId, type: "INITIAL_ASSESSMENT" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: noteSelect,
  });
  const note = notes.length === 1 ? notes[0] : null;
  const decision = decideDoctorClinicalNoteAmendment({
    employeeStatus: employee?.status ?? "INACTIVE",
    activeRoles: employee?.roleAssignments.map((assignment) => assignment.role) ?? [],
    doctorProfileId: employee?.doctorProfile?.id ?? null,
    encounterExists: encounter !== null,
    encounterDoctorId: encounter?.doctorId ?? null,
    encounterStatus: encounter?.status ?? null,
    encounterLifecycleIsConsistent: encounter ? isConsistentEncounterOrigin(encounter) : false,
    noteCount: notes.length,
    noteType: note?.type ?? null,
    noteStatus: note?.status ?? null,
    noteSignedAtExists: note?.signedAt !== null && note?.signedAt !== undefined,
    noteAuthorEmployeeId: note?.authorEmployeeId ?? null,
    actorEmployeeId,
  });
  if (decision.kind === "REJECT") mapRejection(decision.code);
  if (!employee || !encounter || !note) {
    amendmentError("CLINICAL_NOTE_STATE_INCONSISTENT", "The signed clinical note could not be loaded consistently.", 409);
  }

  const baseSnapshot = originalSnapshot(encounter, note);
  const amendments: AmendmentSource[] = await transaction.clinicalAmendment.findMany({
    where: { clinicalNoteId: note.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: amendmentSelect,
  });

  let currentSnapshot = baseSnapshot;
  const history = amendments.map((amendment) => {
    const previousContent = parseSnapshot(amendment.previousContent);
    const correctedContent = parseSnapshot(amendment.correctedContent);
    if (
      !previousContent
      || !correctedContent
      || serializeSnapshot(previousContent) !== serializeSnapshot(currentSnapshot)
      || !amendment.reason.trim()
      || !amendment.createdByEmployeeId
    ) {
      amendmentError("AMENDMENT_HISTORY_INCONSISTENT", "The stored clinical amendment history is inconsistent. No new amendment was created.", 409);
    }
    currentSnapshot = correctedContent;
    return {
      id: amendment.id,
      previousContent,
      correctedContent,
      reason: amendment.reason,
      createdByEmployeeId: amendment.createdByEmployeeId,
      createdAt: amendment.createdAt.toISOString(),
    };
  });

  return { employee, encounter, note, originalContent: baseSnapshot, effectiveContent: currentSnapshot, amendments: history };
}

function toHistoryDto(context: Awaited<ReturnType<typeof loadAuthorizedContext>>) {
  return {
    outcome: "READ" as const,
    encounter: { id: context.encounter.id, status: context.encounter.status },
    clinicalNote: {
      id: context.note.id,
      type: context.note.type,
      status: context.note.status,
      signedAt: context.note.signedAt?.toISOString() ?? null,
    },
    originalContent: context.originalContent,
    effectiveContent: context.effectiveContent,
    amendments: context.amendments,
  };
}

/** Read the immutable original note and its append-only correction history. */
export async function getDoctorClinicalNoteAmendmentHistory(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const context = await loadAuthorizedContext(transaction, encounterId, actorEmployeeId, false);
      return toHistoryDto(context);
    }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorClinicalNoteAmendmentError) throw error;
    if (isPrismaCode(error, "P2034")) {
      amendmentError("CLINICAL_NOTE_CONCURRENT_CHANGE", "The clinical note changed concurrently. Refresh and try again.", 409);
    }
    throw error;
  }
}

/** Append a correction snapshot without changing the signed ClinicalNote row. */
export async function amendDoctorClinicalNote(
  encounterId: string,
  actorEmployeeId: string,
  input: DoctorClinicalNoteAmendmentRequest,
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const context = await loadAuthorizedContext(transaction, encounterId, actorEmployeeId, true);
      const nextSnapshot: ClinicalNoteSnapshot = { ...context.effectiveContent };
      const { changes } = input;

      if (changes.chiefComplaint !== undefined) nextSnapshot.chiefComplaint = changes.chiefComplaint;
      if (changes.historyOfPresentIllness !== undefined) nextSnapshot.historyOfPresentIllness = normalizeOptionalText(changes.historyOfPresentIllness);
      if (changes.clinicalExamination !== undefined) nextSnapshot.clinicalExamination = normalizeOptionalText(changes.clinicalExamination);
      if (changes.assessment !== undefined) nextSnapshot.assessment = normalizeOptionalText(changes.assessment);
      if (changes.treatmentPlan !== undefined) nextSnapshot.treatmentPlan = normalizeOptionalText(changes.treatmentPlan);

      if (!nextSnapshot.chiefComplaint.trim() || !hasClinicalContent(nextSnapshot)) {
        amendmentError("AMENDMENT_CONTENT_INCOMPLETE", "The corrected note must retain a chief complaint and at least one non-empty clinical section.", 400);
      }

      const previousContent = serializeSnapshot(context.effectiveContent);
      const correctedContent = serializeSnapshot(nextSnapshot);
      if (previousContent === correctedContent) {
        return { ...toHistoryDto(context), outcome: "UNCHANGED" as const };
      }

      const latestAmendment = context.amendments[context.amendments.length - 1];
      const nextTimestamp = latestAmendment ? Date.parse(latestAmendment.createdAt) + 1 : Date.now();
      const createdAt = new Date(Math.max(Date.now(), nextTimestamp));
      const amendment = await transaction.clinicalAmendment.create({
        data: {
          clinicalNoteId: context.note.id,
          previousContent,
          correctedContent,
          reason: input.reason,
          createdByEmployeeId: context.employee.id,
          createdAt,
        },
        select: amendmentSelect,
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: context.employee.id,
          action: "DOCTOR_CLINICAL_NOTE_AMENDED",
          entityType: "ClinicalNote",
          entityId: context.note.id,
          reason: `Doctor appended a clinical-note amendment (${amendment.id}) for Encounter ${context.encounter.id}. Clinical content is stored only in ClinicalAmendment.`,
          occurredAt: createdAt,
        },
      });

      return {
        outcome: "AMENDED" as const,
        encounter: { id: context.encounter.id, status: context.encounter.status },
        clinicalNote: {
          id: context.note.id,
          type: context.note.type,
          status: context.note.status,
          signedAt: context.note.signedAt?.toISOString() ?? null,
        },
        originalContent: context.originalContent,
        effectiveContent: nextSnapshot,
        amendments: [
          ...context.amendments,
          {
            id: amendment.id,
            previousContent: context.effectiveContent,
            correctedContent: nextSnapshot,
            reason: amendment.reason,
            createdByEmployeeId: amendment.createdByEmployeeId,
            createdAt: amendment.createdAt.toISOString(),
          },
        ],
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorClinicalNoteAmendmentError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      amendmentError("CLINICAL_NOTE_CONCURRENT_CHANGE", "The Encounter or amendment history changed concurrently. Refresh and try again.", 409);
    }
    throw error;
  }
}
