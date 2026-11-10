import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type { DoctorPrescriptionDraftItem, DoctorPrescriptionDraftRequest } from "./doctor-prescription-validation";
import {
  decideDoctorPrescriptionDraftCreation,
  decideDoctorPrescriptionDraftMutation,
  decideDoctorPrescriptionEncounterAccess,
  decideDoctorPrescriptionIssue,
} from "./doctor-prescription-policy";

export class DoctorPrescriptionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorPrescriptionError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function prescriptionError(code: string, message: string, status: number): never {
  throw new DoctorPrescriptionError(code, message, status);
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

const prescriptionSelect = {
  id: true,
  encounterId: true,
  status: true,
  generalInstructions: true,
  prescribedByEmployeeId: true,
  issuedAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      medicationName: true,
      strength: true,
      dosage: true,
      route: true,
      frequency: true,
      durationDays: true,
      quantity: true,
      quantityUnit: true,
      isPrn: true,
      prnMaxQuantityPerDose: true,
      prnMaxDoseUnit: true,
      prnMaxDosesPerDay: true,
      refills: true,
      instructions: true,
      sortOrder: true,
      createdAt: true,
    },
  },
} satisfies Prisma.PrescriptionSelect;

type PrescriptionSource = Prisma.PrescriptionGetPayload<{ select: typeof prescriptionSelect }>;

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

function normalizeDecimal(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  const [integerPart, decimalPart = ""] = value.trim().split(".");
  const integer = integerPart.replace(/^0+(?=\d)/, "");
  const decimal = decimalPart.replace(/0+$/, "");
  return decimal ? `${integer}.${decimal}` : integer;
}

function toItemCreateData(item: DoctorPrescriptionDraftItem, sortOrder: number) {
  return {
    medicationName: item.medicationName.trim(),
    strength: normalizeOptionalText(item.strength),
    dosage: item.dosage.trim(),
    route: normalizeOptionalText(item.route),
    frequency: item.frequency.trim(),
    durationDays: item.durationDays ?? null,
    quantity: item.quantity ?? null,
    quantityUnit: normalizeOptionalText(item.quantityUnit),
    isPrn: item.isPrn,
    prnMaxQuantityPerDose: item.isPrn ? (item.prnMaxQuantityPerDose ?? null) : null,
    prnMaxDoseUnit: item.isPrn ? normalizeOptionalText(item.prnMaxDoseUnit) : null,
    prnMaxDosesPerDay: item.isPrn ? (item.prnMaxDosesPerDay ?? null) : null,
    refills: item.refills,
    instructions: normalizeOptionalText(item.instructions),
    sortOrder,
  };
}

function areItemsEqual(existing: PrescriptionSource["items"], input: DoctorPrescriptionDraftRequest["items"]): boolean {
  if (existing.length !== input.length) return false;
  return existing.every((row, index) => {
    const next = input[index];
    if (!next) return false;
    const expected = toItemCreateData(next, index);
    return row.medicationName === expected.medicationName
      && row.strength === expected.strength
      && row.dosage === expected.dosage
      && row.route === expected.route
      && row.frequency === expected.frequency
      && row.durationDays === expected.durationDays
      && normalizeDecimal(row.quantity?.toString()) === normalizeDecimal(expected.quantity)
      && row.quantityUnit === expected.quantityUnit
      && row.isPrn === expected.isPrn
      && normalizeDecimal(row.prnMaxQuantityPerDose?.toString()) === normalizeDecimal(expected.prnMaxQuantityPerDose)
      && row.prnMaxDoseUnit === expected.prnMaxDoseUnit
      && row.prnMaxDosesPerDay === expected.prnMaxDosesPerDay
      && row.refills === expected.refills
      && row.instructions === expected.instructions
      && row.sortOrder === expected.sortOrder;
  });
}

function toPrescriptionDto(prescription: PrescriptionSource, actorEmployeeId: string) {
  return {
    id: prescription.id,
    encounterId: prescription.encounterId,
    status: prescription.status,
    generalInstructions: prescription.generalInstructions,
    issuedAt: prescription.issuedAt?.toISOString() ?? null,
    createdAt: prescription.createdAt.toISOString(),
    updatedAt: prescription.updatedAt.toISOString(),
    isEditable: prescription.status === "DRAFT" && prescription.prescribedByEmployeeId === actorEmployeeId,
    items: prescription.items.map((item) => ({
      id: item.id,
      medicationName: item.medicationName,
      strength: item.strength,
      dosage: item.dosage,
      route: item.route,
      frequency: item.frequency,
      durationDays: item.durationDays,
      quantity: item.quantity?.toString() ?? null,
      quantityUnit: item.quantityUnit,
      isPrn: item.isPrn,
      prnMaxQuantityPerDose: item.prnMaxQuantityPerDose?.toString() ?? null,
      prnMaxDoseUnit: item.prnMaxDoseUnit,
      prnMaxDosesPerDay: item.prnMaxDosesPerDay,
      refills: item.refills,
      instructions: item.instructions,
      sortOrder: item.sortOrder,
    })),
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
      message: "Only an active in-progress Encounter can accept a prescription draft.",
      status: 409,
    },
    ENCOUNTER_SOURCE_INCONSISTENT: {
      message: "The Encounter visit source is inconsistent. Contact the clinic administrator.",
      status: 409,
    },
    PRESCRIPTION_DRAFT_ALREADY_EXISTS: {
      message: "A draft prescription already exists for this Encounter. Load it and use the update operation.",
      status: 409,
    },
    PRESCRIPTION_NOT_FOUND: {
      message: "The prescription was not found for this Encounter.",
      status: 404,
    },
    PRESCRIPTION_NOT_EDITABLE: {
      message: "Only a DRAFT prescription can be edited. Issued or cancelled prescriptions are immutable here.",
      status: 409,
    },
    PRESCRIPTION_AUTHOR_MISMATCH: {
      message: "Only the employee who created this prescription draft may edit or issue it.",
      status: 403,
    },
    PRESCRIPTION_STATE_INCONSISTENT: {
      message: "The prescription has an inconsistent issue timestamp. No changes were made.",
      status: 409,
    },
    PRESCRIPTION_NOT_ISSUABLE: {
      message: "Only a DRAFT prescription can be issued. Issued or cancelled prescriptions cannot be issued again.",
      status: 409,
    },
    PRESCRIPTION_ITEMS_INVALID: {
      message: "The prescription must contain between 1 and 20 medication items before it can be issued.",
      status: 409,
    },
  };
  const error = errors[code] ?? { message: "The prescription operation could not be completed.", status: 409 };
  prescriptionError(code, error.message, error.status);
}

async function resolveDoctorEncounter(
  transaction: Transaction,
  encounterId: string,
  actorEmployeeId: string,
  lock: boolean,
): Promise<{ employee: EmployeeSource; encounter: EncounterSource }> {
  if (lock) {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
    `;
    if (locked.length !== 1) mapPolicyRejection("ENCOUNTER_NOT_FOUND");
  }

  const employee: EmployeeSource | null = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: employeeSelect,
  });
  const encounter = await transaction.encounter.findUnique({
    where: { id: encounterId },
    select: encounterSelect,
  });
  const decision = decideDoctorPrescriptionEncounterAccess({
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

/** Read minimal prescription DTOs for the authenticated Doctor's own active Encounter. */
export async function getDoctorEncounterPrescriptions(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const { encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, false);
    const prescriptions = await transaction.prescription.findMany({
      where: { encounterId: encounter.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: prescriptionSelect,
    });
    return {
      encounter: { id: encounter.id, status: encounter.status },
      prescriptions: prescriptions.map((row) => toPrescriptionDto(row, actorEmployeeId)),
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Create the single editable draft prescription for this Encounter; issued history is never rewritten. */
export async function createDoctorPrescriptionDraft(
  encounterId: string,
  actorEmployeeId: string,
  input: DoctorPrescriptionDraftRequest,
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const { employee, encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, true);
      const existingDrafts = await transaction.prescription.findMany({
        where: { encounterId: encounter.id, status: "DRAFT" },
        select: { id: true },
        take: 2,
      });
      const decision = decideDoctorPrescriptionDraftCreation({ existingDraftCount: existingDrafts.length });
      if (decision.kind === "REJECT") mapPolicyRejection(decision.code);

      const created = await transaction.prescription.create({
        data: {
          encounterId: encounter.id,
          status: "DRAFT",
          generalInstructions: normalizeOptionalText(input.generalInstructions),
          prescribedByEmployeeId: employee.id,
        },
        select: { id: true },
      });
      await transaction.prescriptionItem.createMany({
        data: input.items.map((item, index) => ({
          prescriptionId: created.id,
          ...toItemCreateData(item, index),
        })),
      });
      const saved = await transaction.prescription.findUniqueOrThrow({
        where: { id: created.id },
        select: prescriptionSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_PRESCRIPTION_DRAFT_CREATED",
          entityType: "Prescription",
          entityId: saved.id,
          reason: `Doctor created a draft prescription for Encounter ${encounter.id}; itemCount=${input.items.length}. Medication content is not copied into the audit log.`,
          occurredAt: new Date(),
        },
      });
      return { outcome: "CREATED" as const, prescription: toPrescriptionDto(saved, actorEmployeeId) };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorPrescriptionError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      prescriptionError("DOCTOR_PRESCRIPTION_CONCURRENT_CHANGE", "The Encounter prescription changed concurrently. Refresh and try again.", 409);
    }
    throw error;
  }
}

/** Replace a draft's medication rows as one audited edit; only its original author may do so. */
export async function updateDoctorPrescriptionDraft(
  encounterId: string,
  prescriptionId: string,
  actorEmployeeId: string,
  input: DoctorPrescriptionDraftRequest,
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const { employee, encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, true);
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Prescription"
        WHERE "id" = ${prescriptionId} AND "encounterId" = ${encounter.id}
        FOR UPDATE
      `;
      if (locked.length !== 1) mapPolicyRejection("PRESCRIPTION_NOT_FOUND");
      const existing = await transaction.prescription.findFirst({
        where: { id: prescriptionId, encounterId: encounter.id },
        select: prescriptionSelect,
      });
      const decision = decideDoctorPrescriptionDraftMutation({
        prescriptionExists: existing !== null,
        prescriptionStatus: existing?.status ?? null,
        prescribedByEmployeeId: existing?.prescribedByEmployeeId ?? null,
        actorEmployeeId,
        issuedAtExists: existing?.issuedAt !== null && existing?.issuedAt !== undefined,
      });
      if (decision.kind === "REJECT") mapPolicyRejection(decision.code);
      if (!existing) mapPolicyRejection("PRESCRIPTION_NOT_FOUND");

      const nextGeneralInstructions = normalizeOptionalText(input.generalInstructions);
      const unchanged = existing.generalInstructions === nextGeneralInstructions && areItemsEqual(existing.items, input.items);
      if (unchanged) {
        return { outcome: "UNCHANGED" as const, prescription: toPrescriptionDto(existing, actorEmployeeId) };
      }

      const updated = await transaction.prescription.updateMany({
        where: {
          id: existing.id,
          encounterId: encounter.id,
          status: "DRAFT",
          issuedAt: null,
          prescribedByEmployeeId: employee.id,
        },
        data: { generalInstructions: nextGeneralInstructions },
      });
      if (updated.count !== 1) {
        prescriptionError("PRESCRIPTION_STATE_CHANGED", "The draft changed while it was being saved. Refresh before retrying.", 409);
      }
      await transaction.prescriptionItem.deleteMany({ where: { prescriptionId: existing.id } });
      await transaction.prescriptionItem.createMany({
        data: input.items.map((item, index) => ({
          prescriptionId: existing.id,
          ...toItemCreateData(item, index),
        })),
      });
      const saved = await transaction.prescription.findUniqueOrThrow({
        where: { id: existing.id },
        select: prescriptionSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_PRESCRIPTION_DRAFT_UPDATED",
          entityType: "Prescription",
          entityId: saved.id,
          reason: `Doctor updated draft prescription for Encounter ${encounter.id}; itemCount=${input.items.length}. Medication content is not copied into the audit log.`,
          occurredAt: new Date(),
        },
      });
      return { outcome: "UPDATED" as const, prescription: toPrescriptionDto(saved, actorEmployeeId) };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorPrescriptionError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      prescriptionError("DOCTOR_PRESCRIPTION_CONCURRENT_CHANGE", "The Encounter prescription changed concurrently. Refresh and try again.", 409);
    }
    throw error;
  }
}


/** Issue the original author's complete draft as an immutable prescription. */
export async function issueDoctorPrescription(
  encounterId: string,
  prescriptionId: string,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      const { employee, encounter } = await resolveDoctorEncounter(
        transaction,
        encounterId,
        actorEmployeeId,
        true,
      );
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Prescription"
        WHERE "id" = ${prescriptionId} AND "encounterId" = ${encounter.id}
        FOR UPDATE
      `;
      if (locked.length !== 1) mapPolicyRejection("PRESCRIPTION_NOT_FOUND");

      const existing = await transaction.prescription.findFirst({
        where: { id: prescriptionId, encounterId: encounter.id },
        select: prescriptionSelect,
      });
      const decision = decideDoctorPrescriptionIssue({
        prescriptionExists: existing !== null,
        prescriptionStatus: existing?.status ?? null,
        prescribedByEmployeeId: existing?.prescribedByEmployeeId ?? null,
        actorEmployeeId,
        issuedAtExists: existing?.issuedAt !== null && existing?.issuedAt !== undefined,
        itemCount: existing?.items.length ?? 0,
      });
      if (decision.kind === "REJECT") mapPolicyRejection(decision.code);
      if (!existing) mapPolicyRejection("PRESCRIPTION_NOT_FOUND");

      const issuedAt = new Date();
      const updated = await transaction.prescription.updateMany({
        where: {
          id: existing.id,
          encounterId: encounter.id,
          status: "DRAFT",
          issuedAt: null,
          prescribedByEmployeeId: employee.id,
        },
        data: { status: "ISSUED", issuedAt },
      });
      if (updated.count !== 1) {
        prescriptionError(
          "PRESCRIPTION_STATE_CHANGED",
          "The prescription changed while it was being issued. Refresh before retrying.",
          409,
        );
      }

      const saved = await transaction.prescription.findUniqueOrThrow({
        where: { id: existing.id },
        select: prescriptionSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_PRESCRIPTION_ISSUED",
          entityType: "Prescription",
          entityId: saved.id,
          reason: `Doctor issued prescription ${saved.id} for Encounter ${encounter.id}; itemCount=${saved.items.length}. Medication content is not copied into the audit log.`,
          occurredAt: issuedAt,
        },
      });

      return {
        outcome: "ISSUED" as const,
        prescription: toPrescriptionDto(saved, actorEmployeeId),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorPrescriptionError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      prescriptionError(
        "DOCTOR_PRESCRIPTION_CONCURRENT_CHANGE",
        "The Encounter prescription changed concurrently. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
