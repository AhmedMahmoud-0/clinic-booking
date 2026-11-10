import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type { DoctorLabOrderRequest } from "./doctor-lab-order-validation";
import {
  decideDoctorLabEncounterAccess,
  decideDoctorLabTestSelection,
} from "./doctor-lab-order-policy";

export class DoctorLabOrderError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorLabOrderError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function labOrderError(code: string, message: string, status: number): never {
  throw new DoctorLabOrderError(code, message, status);
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

const labTestCatalogSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  specimenType: true,
  defaultTurnaroundMinutes: true,
  requiresFasting: true,
  preparationInstructions: true,
  price: true,
  currencyCode: true,
  isActive: true,
} satisfies Prisma.LabTestSelect;

type LabTestSource = Prisma.LabTestGetPayload<{ select: typeof labTestCatalogSelect }>;

const labOrderSelect = {
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
      createdAt: true,
      labTest: {
        select: {
          id: true,
          code: true,
          name: true,
          specimenType: true,
          defaultTurnaroundMinutes: true,
          requiresFasting: true,
          preparationInstructions: true,
        },
      },
    },
  },
} satisfies Prisma.LabOrderSelect;

type LabOrderSource = Prisma.LabOrderGetPayload<{ select: typeof labOrderSelect }>;

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
      message: "Only an active in-progress Encounter can accept a laboratory order.",
      status: 409,
    },
    ENCOUNTER_SOURCE_INCONSISTENT: {
      message: "The Encounter visit source is inconsistent. Contact the clinic administrator.",
      status: 409,
    },
    LAB_TEST_SELECTION_INVALID: {
      message: "Select between 1 and 20 different laboratory tests.",
      status: 400,
    },
    LAB_TEST_NOT_AVAILABLE: {
      message: "One or more selected laboratory tests are unavailable in the active clinic catalogue.",
      status: 404,
    },
  };
  const error = errors[code] ?? { message: "The laboratory order operation could not be completed.", status: 409 };
  labOrderError(code, error.message, error.status);
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

  // Re-resolve employee status, active Doctor assignment, and DoctorProfile after the lock.
  const employee = await resolveDoctor(transaction, actorEmployeeId);
  const encounter = await transaction.encounter.findUnique({
    where: { id: encounterId },
    select: encounterSelect,
  });
  const decision = decideDoctorLabEncounterAccess({
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

function createLabOrderReference(): string {
  // 4-character prefix + 24 uppercase hex characters = 28 chars (column limit: 30).
  return `LAB-${randomBytes(12).toString("hex").toUpperCase()}`;
}

function toLabTestDto(test: LabTestSource) {
  return {
    id: test.id,
    code: test.code,
    name: test.name,
    description: test.description,
    specimenType: test.specimenType,
    defaultTurnaroundMinutes: test.defaultTurnaroundMinutes,
    requiresFasting: test.requiresFasting,
    preparationInstructions: test.preparationInstructions,
    price: test.price.toString(),
    currencyCode: test.currencyCode,
  };
}

function toLabOrderDto(order: LabOrderSource) {
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
      createdAt: item.createdAt.toISOString(),
      labTest: item.labTest,
    })),
  };
}

/** Search active clinic laboratory tests; this is a catalog lookup, not clinical advice. */
export async function searchDoctorLabCatalog(actorEmployeeId: string, query?: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    await resolveDoctor(transaction, actorEmployeeId);
    const term = query?.trim();
    const rows = await transaction.labTest.findMany({
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
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 30,
      select: labTestCatalogSelect,
    });
    return { items: rows.map(toLabTestDto), limit: 30 };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Read only laboratory orders attached to the authenticated Doctor's own active Encounter. */
export async function getDoctorEncounterLabOrders(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const { encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, false);
    const orders = await transaction.labOrder.findMany({
      where: { encounterId: encounter.id },
      orderBy: [{ orderedAt: "asc" }, { id: "asc" }],
      select: labOrderSelect,
    });
    return {
      encounter: { id: encounter.id, status: encounter.status },
      orders: orders.map(toLabOrderDto),
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 10_000 });
}

/** Create an immediately ORDERED laboratory order from active catalog entries. */
export async function createDoctorLabOrder(
  encounterId: string,
  actorEmployeeId: string,
  input: DoctorLabOrderRequest,
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
      const tests = await transaction.labTest.findMany({
        where: { id: { in: input.labTestIds }, isActive: true },
        select: labTestCatalogSelect,
      });
      const selection = decideDoctorLabTestSelection({
        requestedTestIds: input.labTestIds,
        availableTestIds: tests.map((test) => test.id),
      });
      if (selection.kind === "REJECT") mapPolicyRejection(selection.code);

      const testsById = new Map<string, LabTestSource>();
      for (const test of tests) testsById.set(test.id, test);
      const orderedTests = input.labTestIds.map((id) => {
        const test = testsById.get(id);
        if (!test) mapPolicyRejection("LAB_TEST_NOT_AVAILABLE");
        return test;
      });
      const created = await transaction.labOrder.create({
        data: {
          orderReference: createLabOrderReference(),
          encounterId: encounter.id,
          orderedByEmployeeId: employee.id,
          status: "ORDERED",
          priority: input.priority,
          clinicalNotes: input.clinicalNotes?.trim() || null,
          items: {
            create: orderedTests.map((test) => ({
              labTestId: test.id,
              status: "PENDING",
              priceSnapshot: test.price,
              currencyCode: test.currencyCode,
            })),
          },
        },
        select: { id: true },
      });
      const saved = await transaction.labOrder.findUniqueOrThrow({
        where: { id: created.id },
        select: labOrderSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: "DOCTOR_LAB_ORDER_CREATED",
          entityType: "LabOrder",
          entityId: saved.id,
          reason: `Doctor created laboratory order ${saved.orderReference} for Encounter ${encounter.id}; itemCount=${orderedTests.length}; priority=${input.priority}. Test names and clinical notes are not copied into the audit log.`,
          occurredAt: new Date(),
        },
      });
      return {
        outcome: "CREATED" as const,
        encounter: { id: encounter.id, status: encounter.status },
        order: toLabOrderDto(saved),
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorLabOrderError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) {
      labOrderError(
        "DOCTOR_LAB_ORDER_CONCURRENT_CHANGE",
        "The Encounter or laboratory catalogue changed concurrently. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
