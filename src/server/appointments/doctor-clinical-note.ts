import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { decideDoctorClinicalNoteDraftSave } from "./doctor-clinical-note-policy";

export class DoctorClinicalNoteError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorClinicalNoteError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function clinicalNoteError(code: string, message: string, status: number): never {
  throw new DoctorClinicalNoteError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const employeeSelect = {
  status: true,
  roleAssignments: {
    where: { status: "ACTIVE" },
    select: { role: true },
  },
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
  appointment: {
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      status: true,
    },
  },
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
  clinicalNotes: {
    where: { type: "INITIAL_ASSESSMENT" },
    orderBy: { createdAt: "asc" },
    select: {
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
    },
  },
} satisfies Prisma.EncounterSelect;

type EncounterSource = Prisma.EncounterGetPayload<{ select: typeof encounterSelect }>;

const clinicalNoteResultSelect = {
  id: true,
  type: true,
  status: true,
  subjective: true,
  objective: true,
  assessment: true,
  plan: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ClinicalNoteSelect;

type ClinicalNoteResult = Prisma.ClinicalNoteGetPayload<{ select: typeof clinicalNoteResultSelect }>;

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

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toClinicalNoteDto(note: ClinicalNoteResult) {
  return {
    id: note.id,
    type: note.type,
    status: note.status,
    subjective: note.subjective,
    objective: note.objective,
    assessment: note.assessment,
    plan: note.plan,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function decisionError(decision: Extract<ReturnType<typeof decideDoctorClinicalNoteDraftSave>, { kind: "REJECT" }>): never {
  const errors: Record<typeof decision.code, { message: string; status: number }> = {
    DOCTOR_WORKSPACE_ACCESS_REQUIRED: {
      message: "An active Doctor employee assignment is required to edit this Encounter.",
      status: 403,
    },
    DOCTOR_PROFILE_REQUIRED: {
      message: "The active Doctor employee does not have a linked Doctor profile.",
      status: 403,
    },
    ENCOUNTER_NOT_FOUND: {
      message: "The Encounter was not found for the authenticated Doctor.",
      status: 404,
    },
    ENCOUNTER_NOT_EDITABLE: {
      message: "Only an active in-progress Encounter can accept a draft clinical note.",
      status: 409,
    },
    ENCOUNTER_SOURCE_INCONSISTENT: {
      message: "The Encounter visit source is inconsistent. Contact the clinic administrator.",
      status: 409,
    },
    INITIAL_NOTE_AMBIGUOUS: {
      message: "More than one initial assessment note exists for this Encounter. No note was changed.",
      status: 409,
    },
    INITIAL_NOTE_SIGNED_IMMUTABLE: {
      message: "The initial assessment note is signed and cannot be edited. Use the clinical correction workflow.",
      status: 409,
    },
    INITIAL_NOTE_STATE_INCONSISTENT: {
      message: "The initial assessment note has an invalid signature state. No note was changed.",
      status: 409,
    },
    INITIAL_NOTE_AUTHOR_MISMATCH: {
      message: "The existing draft was authored by another employee and cannot be changed by this account.",
      status: 403,
    },
  };
  const error = errors[decision.code];
  clinicalNoteError(decision.code, error.message, error.status);
}

/** Save or update only the authenticated Doctor's unsigned INITIAL_ASSESSMENT draft. */
export async function saveDoctorClinicalNoteDraft(
  encounterId: string,
  actorEmployeeId: string,
  input: {
    chiefComplaint: string;
    historyOfPresentIllness?: string | null;
    clinicalExamination?: string | null;
    assessment?: string | null;
    treatmentPlan?: string | null;
  },
) {
  const prisma = getPrismaClient();
  const noteData = {
    subjective: normalizeOptionalText(input.historyOfPresentIllness),
    objective: normalizeOptionalText(input.clinicalExamination),
    assessment: normalizeOptionalText(input.assessment),
    plan: normalizeOptionalText(input.treatmentPlan),
  };

  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const initialEmployee = await transaction.employee.findUnique({
        where: { id: actorEmployeeId },
        select: employeeSelect,
      });
      if (
        !initialEmployee
        || initialEmployee.status !== "ACTIVE"
        || !initialEmployee.roleAssignments.some((assignment) => assignment.role === "DOCTOR")
      ) {
        clinicalNoteError(
          "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
          "An active Doctor employee assignment is required to edit this Encounter.",
          403,
        );
      }
      if (!initialEmployee.doctorProfile) {
        clinicalNoteError("DOCTOR_PROFILE_REQUIRED", "The active Doctor profile is not linked.", 403);
      }

      const lock = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
      `;
      if (lock.length !== 1) {
        clinicalNoteError("ENCOUNTER_NOT_FOUND", "The Encounter was not found for the authenticated Doctor.", 404);
      }

      // Re-resolve the actor after acquiring the Encounter lock so a role/profile
      // change that committed while the request was waiting is not trusted.
      const employee: EmployeeSource | null = await transaction.employee.findUnique({
        where: { id: actorEmployeeId },
        select: employeeSelect,
      });
      const encounter = await transaction.encounter.findUnique({
        where: { id: encounterId },
        select: encounterSelect,
      });

      const decision = decideDoctorClinicalNoteDraftSave({
        employeeId: actorEmployeeId,
        employeeStatus: employee?.status ?? "INACTIVE",
        activeRoles: employee?.roleAssignments.map((assignment) => assignment.role) ?? [],
        doctorProfileId: employee?.doctorProfile?.id ?? null,
        encounterExists: encounter !== null,
        encounterDoctorId: encounter?.doctorId ?? null,
        encounterStatus: encounter?.status ?? null,
        encounterCompletedAtExists: encounter?.completedAt !== null && encounter?.completedAt !== undefined,
        encounterOriginIsConsistent: encounter ? isConsistentEncounterOrigin(encounter) : false,
        initialAssessmentNotes: encounter?.clinicalNotes.map((note) => ({
          id: note.id,
          status: note.status,
          authorEmployeeId: note.authorEmployeeId,
          signedAtExists: note.signedAt !== null,
        })) ?? [],
      });

      if (decision.kind === "REJECT") decisionError(decision);
      if (!encounter) {
        clinicalNoteError("ENCOUNTER_NOT_FOUND", "The Encounter was not found for the authenticated Doctor.", 404);
      }

      const existingNote = encounter.clinicalNotes[0];
      const noteUnchanged = decision.kind === "UPDATE"
        && existingNote !== undefined
        && existingNote.subjective === noteData.subjective
        && existingNote.objective === noteData.objective
        && existingNote.assessment === noteData.assessment
        && existingNote.plan === noteData.plan;
      const chiefComplaintUnchanged = encounter.chiefComplaint === input.chiefComplaint.trim();

      if (noteUnchanged && chiefComplaintUnchanged && existingNote) {
        return {
          outcome: "UNCHANGED" as const,
          encounter: {
            id: encounter.id,
            status: encounter.status,
            chiefComplaint: encounter.chiefComplaint,
          },
          clinicalNote: toClinicalNoteDto(existingNote),
        };
      }

      let savedNote: ClinicalNoteResult;
      if (decision.kind === "CREATE") {
        savedNote = await transaction.clinicalNote.create({
          data: {
            encounterId: encounter.id,
            type: "INITIAL_ASSESSMENT",
            status: "DRAFT",
            ...noteData,
            authorEmployeeId: actorEmployeeId,
          },
          select: clinicalNoteResultSelect,
        });
      } else {
        const updated = await transaction.clinicalNote.updateMany({
          where: {
            id: decision.clinicalNoteId,
            encounterId: encounter.id,
            type: "INITIAL_ASSESSMENT",
            status: "DRAFT",
            signedAt: null,
            authorEmployeeId: actorEmployeeId,
          },
          data: noteData,
        });
        if (updated.count !== 1) {
          clinicalNoteError(
            "INITIAL_NOTE_STATE_CHANGED",
            "The clinical note changed while it was being saved. Refresh the Encounter before retrying.",
            409,
          );
        }
        savedNote = await transaction.clinicalNote.findUniqueOrThrow({
          where: { id: decision.clinicalNoteId },
          select: clinicalNoteResultSelect,
        });
      }

      const authenticatedDoctorProfileId = employee?.doctorProfile?.id;
      if (!authenticatedDoctorProfileId) {
        clinicalNoteError("DOCTOR_PROFILE_REQUIRED", "The active Doctor profile is no longer linked.", 403);
      }

      const encounterUpdate = await transaction.encounter.updateMany({
        where: {
          id: encounter.id,
          doctorId: authenticatedDoctorProfileId,
          status: "IN_PROGRESS",
          completedAt: null,
        },
        data: { chiefComplaint: input.chiefComplaint.trim() },
      });
      if (encounterUpdate.count !== 1) {
        clinicalNoteError(
          "ENCOUNTER_STATE_CHANGED",
          "The Encounter changed while the draft was being saved. Refresh before retrying.",
          409,
        );
      }

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "DOCTOR_CLINICAL_NOTE_DRAFT_SAVED",
          entityType: "ClinicalNote",
          entityId: savedNote.id,
          reason: `Doctor saved a draft assessment for Encounter ${encounter.id}. Clinical text is not copied into the audit log.`,
          occurredAt: new Date(),
        },
      });

      return {
        outcome: decision.kind === "CREATE" ? "CREATED" as const : "UPDATED" as const,
        encounter: {
          id: encounter.id,
          status: encounter.status,
          chiefComplaint: input.chiefComplaint.trim(),
        },
        clinicalNote: toClinicalNoteDto(savedNote),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorClinicalNoteError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      clinicalNoteError(
        "CLINICAL_NOTE_CONCURRENT_CHANGE",
        "The Encounter changed concurrently. Refresh the clinical note and try again.",
        409,
      );
    }
    throw error;
  }
}
