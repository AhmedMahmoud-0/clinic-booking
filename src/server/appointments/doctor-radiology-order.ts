import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type { DoctorRadiologyOrderRequest } from "./doctor-radiology-order-validation";
import {
  decideDoctorRadiologyEncounterAccess,
  decideDoctorRadiologyPregnancyAssessment,
  decideDoctorRadiologyProcedureSelection,
} from "./doctor-radiology-order-policy";

export class DoctorRadiologyOrderError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorRadiologyOrderError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function radiologyOrderError(code: string, message: string, status: number): never {
  throw new DoctorRadiologyOrderError(code, message, status);
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

const radiologyProcedureCatalogSelect = {
  id: true,
  code: true,
  name: true,
  modality: true,
  description: true,
  defaultDurationMinutes: true,
  price: true,
  currencyCode: true,
  preparationInstructions: true,
  isActive: true,
} satisfies Prisma.RadiologyProcedureSelect;

type RadiologyProcedureSource = Prisma.RadiologyProcedureGetPayload<{
  select: typeof radiologyProcedureCatalogSelect;
}>;

const radiologyOrderSelect = {
  id: true,
  orderReference: true,
  status: true,
  priority: true,
  clinicalNotes: true,
  orderedAt: true,
  createdAt: true,
  items: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      status: true,
      priceSnapshot: true,
      currencyCode: true,
      instructions: true,
      createdAt: true,
      preOrderPregnancyAssessment: true,
      preOrderPregnancyAssessmentNotes: true,
      preOrderPregnancyAssessedAt: true,
      procedure: {
        select: {
          id: true,
          code: true,
          name: true,
          modality: true,
          defaultDurationMinutes: true,
          preparationInstructions: true,
        },
      },
    },
  },
} satisfies Prisma.RadiologyOrderSelect;

type RadiologyOrderSource = Prisma.RadiologyOrderGetPayload<{ select: typeof radiologyOrderSelect }>;

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
      message: "Only an active in-progress Encounter can accept a radiology order.",
      status: 409,
    },
    ENCOUNTER_SOURCE_INCONSISTENT: {
      message: "The Encounter visit source is inconsistent. Contact the clinic administrator.",
      status: 409,
    },
    RADIOLOGY_PROCEDURE_SELECTION_INVALID: {
      message: "Select between 1 and 10 different radiology procedures.",
      status: 400,
    },
    RADIOLOGY_PROCEDURE_NOT_AVAILABLE: {
      message: "One or more selected radiology procedures are unavailable in the active clinic catalogue.",
      status: 404,
    },
    RADIOLOGY_XRAY_ASSESSMENT_REQUIRED: {
      message: "Every digital X-ray request requires a documented ordering decision about whether formal pregnancy screening is required.",
      status: 400,
    },
    RADIOLOGY_ASSESSMENT_WITHOUT_XRAY: {
      message: "An X-ray screening decision is accepted only when the order includes digital X-ray.",
      status: 400,
    },
    RADIOLOGY_ASSESSMENT_REASON_REQUIRED: {
      message: "A reason is required when formal X-ray pregnancy screening is recorded as not indicated.",
      status: 400,
    },
  };
  const error = errors[code] ?? { message: "The radiology order operation could not be completed.", status: 409 };
  radiologyOrderError(code, error.message, error.status);
}

async function resolveDoctor(
  transaction: Transaction,
  actorEmployeeId: string,
): Promise<EmployeeSource> {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: employeeSelect,
  });
  if (
    !employee
    || employee.status !== "ACTIVE"
    || !employee.roleAssignments.some((assignment) => assignment.role === "DOCTOR")
  ) {
    mapPolicyRejection("DOCTOR_WORKSPACE_ACCESS_REQUIRED");
  }
  if (!employee.doctorProfile) mapPolicyRejection("DOCTOR_PROFILE_REQUIRED");
  return employee;
}

async function resolveDoctorEncounter(
  transaction: Transaction,
  encounterId: string,
  actorEmployeeId: string,
  lock: boolean,
): Promise<{ employee: EmployeeSource; encounter: EncounterSource }> {
  await resolveDoctor(transaction, actorEmployeeId);

  if (lock) {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
    `;
    if (locked.length !== 1) mapPolicyRejection("ENCOUNTER_NOT_FOUND");
  }

  // Re-resolve employee status, active Doctor assignment, and DoctorProfile after the optional lock.
  const employee = await resolveDoctor(transaction, actorEmployeeId);
  const encounter = await transaction.encounter.findUnique({
    where: { id: encounterId },
    select: encounterSelect,
  });
  const decision = decideDoctorRadiologyEncounterAccess({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
    doctorProfileId: employee.doctorProfile?.id ?? null,
    encounterExists: encounter !== null,
    encounterDoctorId: encounter?.doctorId ?? null,
    encounterStatus: encounter?.status ?? null,
    encounterCompletedAtExists: encounter?.completedAt !== null && encounter?.completedAt !== undefined,
    encounterOriginIsConsistent: encounter ? isConsistentEncounterOrigin(encounter) : false,
  });
  if (decision.kind === "REJECT") mapPolicyRejection(decision.code);
  if (!encounter) mapPolicyRejection("ENCOUNTER_NOT_FOUND");
  return { employee, encounter };
}

function createRadiologyOrderReference(): string {
  // 4-character prefix + 24 uppercase hex characters = 28 chars (column limit: 30).
  return `RAD-${randomBytes(12).toString("hex").toUpperCase()}`;
}

function toRadiologyProcedureDto(procedure: RadiologyProcedureSource) {
  return {
    id: procedure.id,
    code: procedure.code,
    name: procedure.name,
    modality: procedure.modality,
    description: procedure.description,
    defaultDurationMinutes: procedure.defaultDurationMinutes,
    preparationInstructions: procedure.preparationInstructions,
    price: procedure.price.toString(),
    currencyCode: procedure.currencyCode,
  };
}

function toRadiologyOrderDto(order: RadiologyOrderSource) {
  return {
    id: order.id,
    orderReference: order.orderReference,
    status: order.status,
    priority: order.priority,
    clinicalNotes: order.clinicalNotes,
    orderedAt: order.orderedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      status: item.status,
      priceSnapshot: item.priceSnapshot.toString(),
      currencyCode: item.currencyCode,
      instructions: item.instructions,
      createdAt: item.createdAt.toISOString(),
      preOrderPregnancyAssessment: item.preOrderPregnancyAssessment === null
        ? null
        : {
            assessment: item.preOrderPregnancyAssessment,
            notes: item.preOrderPregnancyAssessmentNotes,
            assessedAt: item.preOrderPregnancyAssessedAt?.toISOString() ?? null,
          },
      procedure: item.procedure,
    })),
  };
}

/** Search active clinic radiology procedures; catalogue labels are reference data, not clinical advice. */
export async function searchDoctorRadiologyCatalog(actorEmployeeId: string, query?: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    await resolveDoctor(transaction, actorEmployeeId);
    const term = query?.trim();
    const rows = await transaction.radiologyProcedure.findMany({
      where: {
        isActive: true,
        ...(term ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { code: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: [{ modality: "asc" }, { name: "asc" }, { id: "asc" }],
      take: 30,
      select: radiologyProcedureCatalogSelect,
    });
    return { items: rows.map(toRadiologyProcedureDto), limit: 30 };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Read radiology orders attached only to the authenticated Doctor's own active Encounter. */
export async function getDoctorEncounterRadiologyOrders(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const { encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, false);
    const orders = await transaction.radiologyOrder.findMany({
      where: { encounterId: encounter.id },
      orderBy: [{ orderedAt: "asc" }, { id: "asc" }],
      select: radiologyOrderSelect,
    });
    return {
      encounter: { id: encounter.id, status: encounter.status },
      orders: orders.map(toRadiologyOrderDto),
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Create an immediately ORDERED radiology request from active catalogue entries. */
export async function createDoctorRadiologyOrder(
  encounterId: string,
  actorEmployeeId: string,
  input: DoctorRadiologyOrderRequest,
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
      const procedures = await transaction.radiologyProcedure.findMany({
        where: { id: { in: input.procedureIds }, isActive: true },
        select: radiologyProcedureCatalogSelect,
      });
      const selection = decideDoctorRadiologyProcedureSelection({
        requestedProcedureIds: input.procedureIds,
        availableProcedures: procedures.map((procedure) => ({ id: procedure.id, modality: procedure.modality })),
      });
      if (selection.kind === "REJECT") mapPolicyRejection(selection.code);

      const assessment = decideDoctorRadiologyPregnancyAssessment({
        hasDigitalXray: selection.hasDigitalXray,
        assessment: input.xrayPregnancyAssessment?.assessment ?? null,
        notes: input.xrayPregnancyAssessment?.notes?.trim() || null,
      });
      if (assessment.kind === "REJECT") mapPolicyRejection(assessment.code);

      const proceduresById = new Map<string, RadiologyProcedureSource>();
      for (const procedure of procedures) proceduresById.set(procedure.id, procedure);
      const orderedProcedures = input.procedureIds.map((id) => {
        const procedure = proceduresById.get(id);
        if (!procedure) mapPolicyRejection("RADIOLOGY_PROCEDURE_NOT_AVAILABLE");
        return procedure;
      });
      const assessedAt = selection.hasDigitalXray ? new Date() : null;
      const assessmentValue = input.xrayPregnancyAssessment?.assessment ?? null;
      const assessmentNotes = input.xrayPregnancyAssessment?.notes?.trim() || null;
      const created = await transaction.radiologyOrder.create({
        data: {
          orderReference: createRadiologyOrderReference(),
          encounterId: encounter.id,
          orderedByEmployeeId: employee.id,
          status: "ORDERED",
          priority: input.priority,
          clinicalNotes: input.clinicalNotes?.trim() || null,
          items: {
            create: orderedProcedures.map((procedure) => ({
              procedureId: procedure.id,
              status: "PENDING",
              priceSnapshot: procedure.price,
              currencyCode: procedure.currencyCode,
              ...(procedure.modality === "DIGITAL_XRAY" ? {
                preOrderPregnancyAssessment: assessmentValue,
                preOrderPregnancyAssessmentNotes: assessmentNotes,
                preOrderPregnancyAssessedByEmployeeId: employee.id,
                preOrderPregnancyAssessedAt: assessedAt,
              } : {}),
            })),
          },
        },
        select: { id: true },
      });
      const saved = await transaction.radiologyOrder.findUniqueOrThrow({
        where: { id: created.id },
        select: radiologyOrderSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_RADIOLOGY_ORDER_CREATED",
          entityType: "RadiologyOrder",
          entityId: saved.id,
          reason: `Doctor created radiology order ${saved.orderReference} for Encounter ${encounter.id}; itemCount=${orderedProcedures.length}; xrayItemCount=${orderedProcedures.filter((procedure) => procedure.modality === "DIGITAL_XRAY").length}; priority=${input.priority}; order-time X-ray screening decision is recorded where applicable. Clinical notes and assessment notes are not copied into the audit log.`,
          occurredAt: new Date(),
        },
      });
      return {
        outcome: "CREATED" as const,
        encounter: { id: encounter.id, status: encounter.status },
        order: toRadiologyOrderDto(saved),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorRadiologyOrderError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      radiologyOrderError(
        "DOCTOR_RADIOLOGY_ORDER_CONCURRENT_CHANGE",
        "The Encounter or radiology catalogue changed concurrently. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
