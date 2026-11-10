import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import {
  decideDoctorDiagnosisAdd,
  decideDoctorDiagnosisCatalogUse,
  decideDoctorDiagnosisEncounterAccess,
  decideDoctorDiagnosisPrimaryChange,
} from "./doctor-diagnosis-policy";

export class DoctorDiagnosisError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorDiagnosisError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function diagnosisError(code: string, message: string, status: number): never {
  throw new DoctorDiagnosisError(code, message, status);
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
  appointment: {
    select: { id: true, patientId: true, doctorId: true, status: true },
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
} satisfies Prisma.EncounterSelect;

type EncounterSource = Prisma.EncounterGetPayload<{ select: typeof encounterSelect }>;

const diagnosisCatalogSelect = {
  id: true,
  code: true,
  codeSystem: true,
  displayName: true,
  description: true,
  isActive: true,
} satisfies Prisma.DiagnosisCatalogSelect;

const encounterDiagnosisSelect = {
  id: true,
  diagnosisId: true,
  displayNameSnapshot: true,
  isPrimary: true,
  notes: true,
  recordedAt: true,
  diagnosis: { select: diagnosisCatalogSelect },
} satisfies Prisma.EncounterDiagnosisSelect;

type EncounterDiagnosisSource = Prisma.EncounterDiagnosisGetPayload<{
  select: typeof encounterDiagnosisSelect;
}>;

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

function toCatalogDto(diagnosis: Prisma.DiagnosisCatalogGetPayload<{
  select: typeof diagnosisCatalogSelect;
}>) {
  return {
    id: diagnosis.id,
    code: diagnosis.code,
    codeSystem: diagnosis.codeSystem,
    displayName: diagnosis.displayName,
    description: diagnosis.description,
  };
}

function toEncounterDiagnosisDto(diagnosis: EncounterDiagnosisSource) {
  return {
    id: diagnosis.id,
    diagnosisId: diagnosis.diagnosisId,
    displayName: diagnosis.displayNameSnapshot,
    code: diagnosis.diagnosis.code,
    codeSystem: diagnosis.diagnosis.codeSystem,
    isPrimary: diagnosis.isPrimary,
    notes: diagnosis.notes,
    recordedAt: diagnosis.recordedAt.toISOString(),
  };
}

function mapPolicyRejection(code: string): never {
  const errors: Record<string, { message: string; status: number }> = {
    DOCTOR_WORKSPACE_ACCESS_REQUIRED: {
      message: "An active Doctor employee assignment is required for this operation.",
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
      message: "Only an active in-progress Encounter can be changed.",
      status: 409,
    },
    ENCOUNTER_SOURCE_INCONSISTENT: {
      message: "The Encounter visit source is inconsistent. Contact the clinic administrator.",
      status: 409,
    },
    DIAGNOSIS_NOT_AVAILABLE: {
      message: "The selected diagnosis is not available in the active clinic catalogue.",
      status: 404,
    },
    DIAGNOSIS_ALREADY_RECORDED: {
      message: "This diagnosis is already recorded for the Encounter.",
      status: 409,
    },
    ENCOUNTER_DIAGNOSIS_NOT_FOUND: {
      message: "The diagnosis was not found on this Encounter.",
      status: 404,
    },
  };
  const error = errors[code] ?? { message: "The diagnosis operation could not be completed.", status: 409 };
  diagnosisError(code, error.message, error.status);
}

async function resolveDoctorEncounter(
  transaction: Transaction,
  encounterId: string,
  actorEmployeeId: string,
  lock: boolean,
): Promise<{ employee: EmployeeSource; encounter: EncounterSource }> {
  const initialEmployee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: employeeSelect,
  });
  if (
    !initialEmployee
    || initialEmployee.status !== "ACTIVE"
    || !initialEmployee.roleAssignments.some((assignment) => assignment.role === "DOCTOR")
  ) {
    mapPolicyRejection("DOCTOR_WORKSPACE_ACCESS_REQUIRED");
  }
  if (!initialEmployee.doctorProfile) mapPolicyRejection("DOCTOR_PROFILE_REQUIRED");

  if (lock) {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
    `;
    if (locked.length !== 1) mapPolicyRejection("ENCOUNTER_NOT_FOUND");
  }

  // Re-resolve role/profile after the lock is acquired.
  const employee: EmployeeSource | null = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: employeeSelect,
  });
  const encounter = await transaction.encounter.findUnique({
    where: { id: encounterId },
    select: encounterSelect,
  });

  const decision = decideDoctorDiagnosisEncounterAccess({
    employeeStatus: employee?.status ?? "INACTIVE",
    activeRoles: employee?.roleAssignments.map((assignment) => assignment.role) ?? [],
    doctorProfileId: employee?.doctorProfile?.id ?? null,
    encounterExists: encounter !== null,
    encounterDoctorId: encounter?.doctorId ?? null,
    encounterStatus: encounter?.status ?? null,
    encounterCompletedAtExists: encounter?.completedAt !== null && encounter?.completedAt !== undefined,
    encounterOriginIsConsistent: encounter ? isConsistentEncounterOrigin(encounter) : false,
  });
  if (decision.kind === "REJECT") mapPolicyRejection(decision.code);
  if (!employee || !encounter) mapPolicyRejection("ENCOUNTER_NOT_FOUND");
  return { employee, encounter };
}

/** Search the active seeded diagnosis catalogue; labels are reference data, not clinical advice. */
export async function searchDoctorDiagnosisCatalog(actorEmployeeId: string, query?: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const employee = await transaction.employee.findUnique({
      where: { id: actorEmployeeId },
      select: employeeSelect,
    });
    if (
      !employee
      || employee.status !== "ACTIVE"
      || !employee.roleAssignments.some((assignment) => assignment.role === "DOCTOR")
    ) mapPolicyRejection("DOCTOR_WORKSPACE_ACCESS_REQUIRED");
    if (!employee.doctorProfile) mapPolicyRejection("DOCTOR_PROFILE_REQUIRED");

    const term = query?.trim();
    const rows = await transaction.diagnosisCatalog.findMany({
      where: {
        isActive: true,
        ...(term ? {
          OR: [
            { displayName: { contains: term, mode: "insensitive" } },
            { code: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      take: 30,
      select: diagnosisCatalogSelect,
    });
    return { items: rows.map(toCatalogDto), limit: 30 };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Read only the active Encounter's assigned Doctor diagnoses. */
export async function getDoctorEncounterDiagnoses(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const { encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, false);
    const rows = await transaction.encounterDiagnosis.findMany({
      where: { encounterId: encounter.id },
      orderBy: [{ isPrimary: "desc" }, { recordedAt: "asc" }, { id: "asc" }],
      select: encounterDiagnosisSelect,
    });
    return {
      encounter: { id: encounter.id, status: encounter.status },
      diagnoses: rows.map(toEncounterDiagnosisDto),
      primaryDiagnosisId: rows.find((row) => row.isPrimary)?.id ?? null,
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Add one coded diagnosis from the active catalog. The first diagnosis becomes primary by default. */
export async function addDoctorEncounterDiagnosis(
  encounterId: string,
  actorEmployeeId: string,
  input: { diagnosisId: string; notes?: string | null; isPrimary: boolean },
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const { employee, encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, true);
      const diagnosis = await transaction.diagnosisCatalog.findUnique({
        where: { id: input.diagnosisId },
        select: diagnosisCatalogSelect,
      });
      const catalogueDecision = decideDoctorDiagnosisCatalogUse({
        diagnosisExists: diagnosis !== null,
        diagnosisIsActive: diagnosis?.isActive ?? false,
      });
      if (catalogueDecision.kind === "REJECT") mapPolicyRejection(catalogueDecision.code);
      if (!diagnosis) mapPolicyRejection("DIAGNOSIS_NOT_AVAILABLE");

      const existing = await transaction.encounterDiagnosis.findUnique({
        where: { encounterId_diagnosisId: { encounterId: encounter.id, diagnosisId: diagnosis.id } },
        select: { id: true },
      });
      const currentPrimary = await transaction.encounterDiagnosis.findFirst({
        where: { encounterId: encounter.id, isPrimary: true },
        select: { id: true },
      });
      const decision = decideDoctorDiagnosisAdd({
        alreadyRecorded: existing !== null,
        currentPrimaryExists: currentPrimary !== null,
        requestedPrimary: input.isPrimary,
      });
      if (decision.kind === "REJECT") mapPolicyRejection(decision.code);

      if (decision.demoteCurrentPrimary) {
        await transaction.encounterDiagnosis.updateMany({
          where: { encounterId: encounter.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const created = await transaction.encounterDiagnosis.create({
        data: {
          encounterId: encounter.id,
          diagnosisId: diagnosis.id,
          displayNameSnapshot: diagnosis.displayName,
          isPrimary: decision.isPrimary,
          notes: input.notes?.trim() || null,
          recordedByEmployeeId: employee.id,
        },
        select: encounterDiagnosisSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_ENCOUNTER_DIAGNOSIS_ADDED",
          entityType: "EncounterDiagnosis",
          entityId: created.id,
          reason: `Doctor added catalogue diagnosis ${diagnosis.id} to Encounter ${encounter.id}; previousPrimary=${currentPrimary?.id ?? "none"}; primary=${decision.isPrimary}.`,
          occurredAt: new Date(),
        },
      });
      return {
        outcome: "CREATED" as const,
        encounter: { id: encounter.id, status: encounter.status },
        diagnosis: toEncounterDiagnosisDto(created),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorDiagnosisError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      diagnosisError(
        "DOCTOR_DIAGNOSIS_CONCURRENT_CHANGE",
        "The Encounter diagnosis list changed concurrently. Refresh the list and try again.",
        409,
      );
    }
    throw error;
  }
}

/** Promote an existing diagnosis without deleting or rewriting any diagnosis row. */
export async function setDoctorEncounterPrimaryDiagnosis(
  encounterId: string,
  encounterDiagnosisId: string,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const { employee, encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, true);
      const target = await transaction.encounterDiagnosis.findFirst({
        where: { id: encounterDiagnosisId, encounterId: encounter.id },
        select: { id: true, isPrimary: true },
      });
      const decision = decideDoctorDiagnosisPrimaryChange({
        targetExists: target !== null,
        targetIsPrimary: target?.isPrimary ?? false,
      });
      if (decision.kind === "REJECT") mapPolicyRejection(decision.code);
      if (decision.kind === "UNCHANGED") {
        const row = await transaction.encounterDiagnosis.findUniqueOrThrow({
          where: { id: encounterDiagnosisId },
          select: encounterDiagnosisSelect,
        });
        return { outcome: "UNCHANGED" as const, diagnosis: toEncounterDiagnosisDto(row) };
      }

      const previousPrimary = await transaction.encounterDiagnosis.findFirst({
        where: { encounterId: encounter.id, isPrimary: true },
        select: { id: true },
      });
      await transaction.encounterDiagnosis.updateMany({
        where: { encounterId: encounter.id, isPrimary: true },
        data: { isPrimary: false },
      });
      const promoted = await transaction.encounterDiagnosis.updateMany({
        where: { id: encounterDiagnosisId, encounterId: encounter.id },
        data: { isPrimary: true },
      });
      if (promoted.count !== 1) {
        diagnosisError(
          "ENCOUNTER_DIAGNOSIS_STATE_CHANGED",
          "The diagnosis changed while its primary status was being updated. Refresh and retry.",
          409,
        );
      }
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_ENCOUNTER_DIAGNOSIS_PRIMARY_CHANGED",
          entityType: "EncounterDiagnosis",
          entityId: encounterDiagnosisId,
          reason: `Primary diagnosis changed for Encounter ${encounter.id}; previous=${previousPrimary?.id ?? "none"}; current=${encounterDiagnosisId}.`,
          occurredAt: new Date(),
        },
      });
      const row = await transaction.encounterDiagnosis.findUniqueOrThrow({
        where: { id: encounterDiagnosisId },
        select: encounterDiagnosisSelect,
      });
      return { outcome: "PRIMARY_CHANGED" as const, diagnosis: toEncounterDiagnosisDto(row) };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorDiagnosisError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      diagnosisError(
        "DOCTOR_DIAGNOSIS_CONCURRENT_CHANGE",
        "The Encounter diagnosis list changed concurrently. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
