import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { decideDoctorClinicalNoteSign } from "./doctor-clinical-note-sign-policy";

export class DoctorClinicalNoteSignError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorClinicalNoteSignError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function signError(code: string, message: string, status: number): never {
  throw new DoctorClinicalNoteSignError(code, message, status);
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

function isConsistentEncounterOrigin(encounter: EncounterSource): boolean {
  if (encounter.appointmentId !== null && encounter.queueEntryId === null) {
    return encounter.appointment !== null
      && encounter.appointment.id === encounter.appointmentId
      && encounter.appointment.patientId === encounter.patientId
      && encounter.appointment.doctorId === encounter.doctorId
      && encounter.appointment.status === "IN_CONSULTATION"
      && encounter.queueEntry === null;
  }
  if (encounter.appointmentId === null && encounter.queueEntryId !== null) {
    return encounter.appointment === null
      && encounter.queueEntry !== null
      && encounter.queueEntry.id === encounter.queueEntryId
      && encounter.queueEntry.patientId === encounter.patientId
      && encounter.queueEntry.doctorId === encounter.doctorId
      && encounter.queueEntry.appointmentId === null
      && encounter.queueEntry.type === "WALK_IN"
      && encounter.queueEntry.status === "IN_SERVICE"
      && encounter.queueEntry.serviceStartedAt !== null;
  }
  return false;
}

function toNoteDto(note: ClinicalNoteSource) {
  return {
    id: note.id,
    type: note.type,
    status: note.status,
    subjective: note.subjective,
    objective: note.objective,
    assessment: note.assessment,
    plan: note.plan,
    signedAt: note.signedAt?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function mapRejection(code: string): never {
  const errors: Record<string, { message: string; status: number }> = {
    DOCTOR_WORKSPACE_ACCESS_REQUIRED: { message: "An active Doctor employee assignment is required to sign this note.", status: 403 },
    DOCTOR_PROFILE_REQUIRED: { message: "The active Doctor employee does not have a linked Doctor profile.", status: 403 },
    ENCOUNTER_NOT_FOUND: { message: "The Encounter was not found for the authenticated Doctor.", status: 404 },
    ENCOUNTER_NOT_EDITABLE: { message: "Only an active in-progress Encounter can accept a signed clinical note.", status: 409 },
    ENCOUNTER_SOURCE_INCONSISTENT: { message: "The Encounter visit source is inconsistent. Contact the clinic administrator.", status: 409 },
    INITIAL_NOTE_MISSING: { message: "Save an initial assessment draft before signing the clinical note.", status: 409 },
    INITIAL_NOTE_AMBIGUOUS: { message: "More than one initial assessment note exists for this Encounter. No note was signed.", status: 409 },
    INITIAL_NOTE_ALREADY_SIGNED: { message: "The initial assessment note is already signed and cannot be signed again.", status: 409 },
    INITIAL_NOTE_STATE_INCONSISTENT: { message: "The initial assessment note has an inconsistent signature state. No note was changed.", status: 409 },
    INITIAL_NOTE_AUTHOR_MISMATCH: { message: "Only the Doctor who authored this draft may sign it.", status: 403 },
    INITIAL_NOTE_CONTENT_INCOMPLETE: { message: "A chief complaint and at least one clinical note section are required before signing.", status: 400 },
  };
  const error = errors[code] ?? { message: "The clinical note cannot be signed in its current state.", status: 409 };
  signError(code, error.message, error.status);
}

/** Sign the authenticated Doctor's own initial-assessment draft without completing the Encounter. */
export async function signDoctorClinicalNote(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const lock = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
      `;
      if (lock.length !== 1) {
        signError("ENCOUNTER_NOT_FOUND", "The Encounter was not found for the authenticated Doctor.", 404);
      }

      // Re-resolve active staff identity after the Encounter lock is acquired.
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
      const decision = decideDoctorClinicalNoteSign({
        employeeStatus: employee?.status ?? "INACTIVE",
        activeRoles: employee?.roleAssignments.map((assignment) => assignment.role) ?? [],
        doctorProfileId: employee?.doctorProfile?.id ?? null,
        encounterExists: encounter !== null,
        encounterDoctorId: encounter?.doctorId ?? null,
        encounterStatus: encounter?.status ?? null,
        encounterCompletedAtExists: encounter?.completedAt !== null && encounter?.completedAt !== undefined,
        encounterOriginIsConsistent: encounter ? isConsistentEncounterOrigin(encounter) : false,
        noteCount: notes.length,
        noteStatus: note?.status ?? null,
        noteSignedAtExists: note?.signedAt !== null && note?.signedAt !== undefined,
        noteAuthorEmployeeId: note?.authorEmployeeId ?? null,
        actorEmployeeId,
        chiefComplaint: encounter?.chiefComplaint ?? null,
        hasClinicalContent: Boolean(
          note && [note.subjective, note.objective, note.assessment, note.plan].some((value) => value?.trim()),
        ),
      });
      if (decision.kind === "REJECT") mapRejection(decision.code);
      if (!encounter || !note || !employee) {
        signError("INITIAL_NOTE_STATE_INCONSISTENT", "The clinical note state changed. Refresh and try again.", 409);
      }

      const noteLock = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "ClinicalNote"
        WHERE "id" = ${note.id} AND "encounterId" = ${encounter.id}
        FOR UPDATE
      `;
      if (noteLock.length !== 1) {
        signError("INITIAL_NOTE_STATE_CHANGED", "The clinical note changed while it was being signed. Refresh and try again.", 409);
      }

      const signedAt = new Date();
      const updated = await transaction.clinicalNote.updateMany({
        where: {
          id: note.id,
          encounterId: encounter.id,
          type: "INITIAL_ASSESSMENT",
          status: "DRAFT",
          signedAt: null,
          authorEmployeeId: employee.id,
        },
        data: { status: "SIGNED", signedAt },
      });
      if (updated.count !== 1) {
        signError("INITIAL_NOTE_STATE_CHANGED", "The clinical note changed while it was being signed. Refresh and try again.", 409);
      }

      const saved = await transaction.clinicalNote.findUniqueOrThrow({ where: { id: note.id }, select: noteSelect });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_CLINICAL_NOTE_SIGNED",
          entityType: "ClinicalNote",
          entityId: saved.id,
          reason: `Doctor signed the initial assessment for Encounter ${encounter.id}. Clinical text is not copied into the audit log.`,
          occurredAt: signedAt,
        },
      });

      return {
        outcome: "SIGNED" as const,
        encounter: { id: encounter.id, status: encounter.status },
        clinicalNote: toNoteDto(saved),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorClinicalNoteSignError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      signError("CLINICAL_NOTE_CONCURRENT_CHANGE", "The Encounter or clinical note changed concurrently. Refresh and try again.", 409);
    }
    throw error;
  }
}
