import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type {
  CreateNursingTaskRequest,
  NurseTaskActionRequest,
  NurseVitalSignRequest,
  ResolveNursingTaskRequest,
} from "./nursing-workflow-validation";
import {
  decideDoctorEncounterCompletion,
  decideDoctorNursingTaskResolution,
  decideNurseTaskAction,
  decideNursingTaskAssignment,
  isAppointmentQueueSourceConsistent,
} from "./nursing-workflow-policy";

export class NursingWorkflowError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "NursingWorkflowError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function nursingError(code: string, message: string, status: number): never {
  throw new NursingWorkflowError(code, message, status);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const encounterSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  appointmentId: true,
  queueEntryId: true,
  status: true,
  completedAt: true,
  appointment: { select: {
    id: true, patientId: true, doctorId: true, status: true, completedAt: true,
    queueEntry: { select: { id: true, patientId: true, doctorId: true, appointmentId: true, type: true, status: true, serviceStartedAt: true, completedAt: true } },
  } },
  queueEntry: { select: { id: true, patientId: true, doctorId: true, appointmentId: true, type: true, status: true, serviceStartedAt: true, completedAt: true } },
} satisfies Prisma.EncounterSelect;
type EncounterSource = Prisma.EncounterGetPayload<{ select: typeof encounterSelect }>;

const taskSelect = {
  id: true,
  encounterId: true,
  assignedToEmployeeId: true,
  createdByEmployeeId: true,
  taskType: true,
  status: true,
  instructions: true,
  dueAt: true,
  startedAt: true,
  completedAt: true,
  completedByEmployeeId: true,
  cancelledAt: true,
  cancelledByEmployeeId: true,
  cancellationNote: true,
  escalatedAt: true,
  escalationNote: true,
  escalationResolvedAt: true,
  escalationResolutionNote: true,
  createdAt: true,
  updatedAt: true,
  assignedToEmployee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true, status: true } },
  createdByEmployee: { select: { id: true, firstName: true, lastName: true } },
  vitalSigns: {
    orderBy: [{ measuredAt: "desc" }, { id: "desc" }],
    select: { id: true, measuredAt: true, temperatureC: true, systolicMmHg: true, diastolicMmHg: true, pulseBpm: true, respiratoryRatePerMin: true, oxygenSaturationPct: true, heightCm: true, weightKg: true, bmi: true, note: true, recordedByEmployeeId: true },
  },
} satisfies Prisma.NursingTaskSelect;
type NursingTaskSource = Prisma.NursingTaskGetPayload<{ select: typeof taskSelect }>;

function isConsistentEncounterOrigin(encounter: EncounterSource): boolean {
  if (encounter.status === "IN_PROGRESS" && encounter.completedAt !== null) return false;
  if (encounter.status === "COMPLETED" && encounter.completedAt === null) return false;
  if (encounter.status !== "IN_PROGRESS" && encounter.status !== "COMPLETED") return false;
  if (encounter.appointmentId !== null && encounter.queueEntryId === null) {
    return encounter.appointment !== null
      && encounter.appointment.id === encounter.appointmentId
      && encounter.queueEntry === null
      && isAppointmentQueueSourceConsistent({
        encounterPatientId: encounter.patientId,
        encounterDoctorId: encounter.doctorId,
        encounterStatus: encounter.status,
        appointmentId: encounter.appointment.id,
        appointmentPatientId: encounter.appointment.patientId,
        appointmentDoctorId: encounter.appointment.doctorId,
        appointmentStatus: encounter.appointment.status,
        appointmentCompletedAtExists: encounter.appointment.completedAt !== null,
        queueEntry: encounter.appointment.queueEntry === null ? null : {
          patientId: encounter.appointment.queueEntry.patientId,
          doctorId: encounter.appointment.queueEntry.doctorId,
          appointmentId: encounter.appointment.queueEntry.appointmentId,
          type: encounter.appointment.queueEntry.type,
          status: encounter.appointment.queueEntry.status,
          serviceStartedAtExists: encounter.appointment.queueEntry.serviceStartedAt !== null,
          completedAtExists: encounter.appointment.queueEntry.completedAt !== null,
        },
      });
  }
  if (encounter.appointmentId === null && encounter.queueEntryId !== null) {
    return encounter.appointment === null
      && encounter.queueEntry !== null
      && encounter.queueEntry.id === encounter.queueEntryId
      && encounter.queueEntry.patientId === encounter.patientId
      && encounter.queueEntry.doctorId === encounter.doctorId
      && encounter.queueEntry.appointmentId === null
      && encounter.queueEntry.type === "WALK_IN"
      && encounter.queueEntry.status === (encounter.status === "COMPLETED" ? "COMPLETED" : "IN_SERVICE")
      && encounter.queueEntry.serviceStartedAt !== null
      && (encounter.status === "COMPLETED" ? encounter.queueEntry.completedAt !== null : encounter.queueEntry.completedAt === null);
  }
  return false;
}

async function lockEncounter(transaction: Transaction, encounterId: string): Promise<void> {
  const locked = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Encounter" WHERE "id" = ${encounterId} FOR UPDATE
  `;
  if (locked.length !== 1) nursingError("ENCOUNTER_NOT_FOUND", "The Encounter was not found.", 404);
}

async function resolveDoctor(transaction: Transaction, actorEmployeeId: string) {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: { id: true, status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } }, doctorProfile: { select: { id: true } } },
  });
  if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((row) => row.role === "DOCTOR")) {
    nursingError("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor employee assignment is required.", 403);
  }
  if (!employee.doctorProfile) nursingError("DOCTOR_PROFILE_REQUIRED", "The Doctor employee has no linked Doctor profile.", 403);
  return employee;
}

async function resolveNurse(transaction: Transaction, actorEmployeeId: string) {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: { id: true, status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } } },
  });
  if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((row) => row.role === "NURSE")) {
    nursingError("NURSE_WORKSPACE_ACCESS_REQUIRED", "An active Nurse employee assignment is required.", 403);
  }
  return employee;
}

async function resolveDoctorEncounter(
  transaction: Transaction,
  encounterId: string,
  actorEmployeeId: string,
  requireInProgress = true,
): Promise<{ employee: Awaited<ReturnType<typeof resolveDoctor>>; encounter: EncounterSource }> {
  const employee = await resolveDoctor(transaction, actorEmployeeId);
  const encounter = await transaction.encounter.findUnique({ where: { id: encounterId }, select: encounterSelect });
  const doctorProfileId = employee.doctorProfile?.id;
  if (!encounter || !doctorProfileId || encounter.doctorId !== doctorProfileId) nursingError("ENCOUNTER_NOT_FOUND", "The Encounter was not found for the authenticated Doctor.", 404);
  if (requireInProgress && encounter.status !== "IN_PROGRESS") nursingError("ENCOUNTER_NOT_EDITABLE", "Only an active in-progress Encounter can be changed.", 409);
  if (!isConsistentEncounterOrigin(encounter)) nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The Encounter visit source is inconsistent.", 409);
  return { employee, encounter };
}

function mapPolicyError(code: string): never {
  const details: Record<string, { message: string; status: number }> = {
    DOCTOR_WORKSPACE_ACCESS_REQUIRED: { message: "An active Doctor employee assignment is required.", status: 403 },
    DOCTOR_PROFILE_REQUIRED: { message: "The Doctor employee has no linked Doctor profile.", status: 403 },
    NURSE_WORKSPACE_ACCESS_REQUIRED: { message: "An active Nurse employee assignment is required.", status: 403 },
    ENCOUNTER_NOT_FOUND: { message: "The Encounter was not found for the authenticated Doctor.", status: 404 },
    ENCOUNTER_NOT_EDITABLE: { message: "Only an active in-progress Encounter can be changed.", status: 409 },
    ENCOUNTER_SOURCE_INCONSISTENT: { message: "The Encounter visit source is inconsistent.", status: 409 },
    ASSIGNED_NURSE_NOT_AVAILABLE: { message: "Select an active employee with an active Nurse role.", status: 400 },
    NURSING_TASK_TYPE_INVALID: { message: "The requested nursing task type is not supported.", status: 400 },
    NURSING_TASK_NOT_FOUND: { message: "The nursing task was not found for this employee or Encounter.", status: 404 },
    NURSING_TASK_NOT_STARTABLE: { message: "Only a pending assigned task can be started.", status: 409 },
    NURSING_TASK_NOT_IN_PROGRESS: { message: "Only an in-progress task can be completed or escalated.", status: 409 },
    NURSING_VITALS_REQUIRED: { message: "Record at least one vital-sign measurement before completing this task.", status: 409 },
    NURSING_TASK_NOT_ESCALATED: { message: "Only an escalated task can be resumed.", status: 409 },
    NURSING_TASK_NOT_CANCELLABLE: { message: "This nursing task can no longer be cancelled.", status: 409 },
    ENCOUNTER_NOT_COMPLETABLE: { message: "The Encounter is not in a completable state.", status: 409 },
    SIGNED_INITIAL_NOTE_REQUIRED: { message: "The Encounter requires exactly one signed initial assessment authored by the current Doctor.", status: 409 },
    NURSING_TASKS_PENDING: { message: "Complete, resolve, or cancel all open nursing tasks before closing the Encounter.", status: 409 },
    DRAFT_PRESCRIPTIONS_PENDING: { message: "Issue or remove draft prescriptions before closing the Encounter.", status: 409 },
  };
  const error = details[code] ?? { message: "The nursing workflow operation could not be completed.", status: 409 };
  nursingError(code, error.message, error.status);
}

function toTaskDto(task: NursingTaskSource) {
  return {
    id: task.id,
    encounterId: task.encounterId,
    taskType: task.taskType,
    status: task.status,
    instructions: task.instructions,
    dueAt: task.dueAt?.toISOString() ?? null,
    startedAt: task.startedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    escalatedAt: task.escalatedAt?.toISOString() ?? null,
    escalationNote: task.escalationNote,
    cancellationNote: task.cancellationNote,
    escalationResolvedAt: task.escalationResolvedAt?.toISOString() ?? null,
    escalationResolutionNote: task.escalationResolutionNote,
    createdAt: task.createdAt.toISOString(),
    assignedNurse: {
      id: task.assignedToEmployee.id,
      employeeNumber: task.assignedToEmployee.employeeNumber,
      name: `${task.assignedToEmployee.firstName} ${task.assignedToEmployee.lastName}`.trim(),
      isActive: task.assignedToEmployee.status === "ACTIVE",
    },
    createdBy: { id: task.createdByEmployee.id, name: `${task.createdByEmployee.firstName} ${task.createdByEmployee.lastName}`.trim() },
    vitalSigns: task.vitalSigns.map((vital) => ({
      id: vital.id,
      measuredAt: vital.measuredAt.toISOString(),
      temperatureC: vital.temperatureC === null ? null : Number(vital.temperatureC),
      systolicMmHg: vital.systolicMmHg,
      diastolicMmHg: vital.diastolicMmHg,
      pulseBpm: vital.pulseBpm,
      respiratoryRatePerMin: vital.respiratoryRatePerMin,
      oxygenSaturationPct: vital.oxygenSaturationPct === null ? null : Number(vital.oxygenSaturationPct),
      heightCm: vital.heightCm === null ? null : Number(vital.heightCm),
      weightKg: vital.weightKg === null ? null : Number(vital.weightKg),
      bmi: vital.bmi === null ? null : Number(vital.bmi),
      note: vital.note,
    })),
  };
}

export async function createDoctorNursingTask(encounterId: string, actorEmployeeId: string, input: CreateNursingTaskRequest) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await lockEncounter(transaction, encounterId);
      const { employee, encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId);
      const nurse = await transaction.employee.findUnique({
        where: { id: input.assignedToEmployeeId },
        select: { id: true, status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } } },
      });
      const decision = decideNursingTaskAssignment({
        doctorActive: employee.status === "ACTIVE",
        doctorHasRole: employee.roleAssignments.some((row) => row.role === "DOCTOR"),
        doctorProfileId: employee.doctorProfile?.id ?? null,
        encounterExists: true,
        encounterDoctorId: encounter.doctorId,
        encounterStatus: encounter.status,
        encounterSourceConsistent: isConsistentEncounterOrigin(encounter),
        nurseActive: nurse?.status === "ACTIVE",
        nurseHasRole: Boolean(nurse?.roleAssignments.some((row) => row.role === "NURSE")),
        taskType: input.taskType,
      });
      if (decision.kind === "REJECT") mapPolicyError(decision.code);
      const now = new Date();
      const task = await transaction.nursingTask.create({
        data: {
          encounterId,
          assignedToEmployeeId: nurse!.id,
          createdByEmployeeId: actorEmployeeId,
          taskType: input.taskType,
          instructions: input.instructions ?? null,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        },
        select: { id: true, taskType: true, status: true, assignedToEmployeeId: true, createdAt: true },
      });
      await transaction.auditLog.create({ data: {
        actorType: "EMPLOYEE", actorEmployeeId, action: "NURSING_TASK_ASSIGNED", entityType: "NursingTask", entityId: task.id, reason: task.taskType, occurredAt: now,
      } });
      return { task: { id: task.id, taskType: task.taskType, status: task.status, assignedToEmployeeId: task.assignedToEmployeeId, createdAt: task.createdAt.toISOString() } };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) nursingError("NURSING_TASK_CONFLICT", "The Encounter changed during task assignment. Refresh and try again.", 409);
    throw error;
  }
}

export async function getDoctorEncounterNursingTasks(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const { encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId, false);
    const tasks = await transaction.nursingTask.findMany({ where: { encounterId: encounter.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: taskSelect });
    return { encounter: { id: encounter.id, status: encounter.status }, tasks: tasks.map(toTaskDto) };
  });
}

export async function getNurseAssignedTasks(actorEmployeeId: string) {
  const prisma = getPrismaClient();
  const employee = await prisma.employee.findUnique({
    where: { id: actorEmployeeId },
    select: { id: true, status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } } },
  });
  if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((row) => row.role === "NURSE")) {
    nursingError("NURSE_WORKSPACE_ACCESS_REQUIRED", "An active Nurse employee assignment is required.", 403);
  }
  const assignedTaskSelect = {
    ...taskSelect,
    encounter: { select: { id: true, status: true, patient: { select: { id: true, firstName: true, middleName: true, lastName: true, preferredName: true, mrn: true, isActive: true } }, doctor: { select: { publicDisplayName: true, professionalTitle: true, employee: { select: { firstName: true, lastName: true } } } }, appointment: { select: { startsAt: true } } } },
  } satisfies Prisma.NursingTaskSelect;
  const tasks = await prisma.nursingTask.findMany({
    where: { assignedToEmployeeId: actorEmployeeId, encounter: { is: { status: "IN_PROGRESS" } } },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: assignedTaskSelect,
  });
  return { tasks: tasks.map((task) => ({
    ...toTaskDto(task),
    patient: {
      id: task.encounter.patient.id,
      name: task.encounter.patient.preferredName?.trim() || [task.encounter.patient.firstName, task.encounter.patient.middleName, task.encounter.patient.lastName].filter(Boolean).join(" "),
      mrn: task.encounter.patient.mrn,
      isActive: task.encounter.patient.isActive,
    },
    doctorName: task.encounter.doctor.publicDisplayName?.trim() || [task.encounter.doctor.professionalTitle, task.encounter.doctor.employee.firstName, task.encounter.doctor.employee.lastName].filter(Boolean).join(" "),
    appointmentStartsAt: task.encounter.appointment?.startsAt.toISOString() ?? null,
  })) };
}

async function findTaskEncounterId(taskId: string): Promise<string> {
  const prisma = getPrismaClient();
  const task = await prisma.nursingTask.findUnique({ where: { id: taskId }, select: { encounterId: true } });
  if (!task) nursingError("NURSING_TASK_NOT_FOUND", "The nursing task was not found.", 404);
  return task.encounterId;
}

export async function applyNurseTaskAction(taskId: string, actorEmployeeId: string, input: NurseTaskActionRequest) {
  const prisma = getPrismaClient();
  const encounterId = await findTaskEncounterId(taskId);
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await lockEncounter(transaction, encounterId);
      const nurse = await resolveNurse(transaction, actorEmployeeId);
      const taskLock = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "NursingTask" WHERE "id" = ${taskId} AND "encounterId" = ${encounterId} FOR UPDATE`;
      if (taskLock.length !== 1) nursingError("NURSING_TASK_NOT_FOUND", "The nursing task was not found.", 404);
      const task = await transaction.nursingTask.findUnique({ where: { id: taskId }, select: { id: true, encounterId: true, assignedToEmployeeId: true, taskType: true, status: true } });
      const encounter = await transaction.encounter.findUnique({ where: { id: encounterId }, select: encounterSelect });
      if (!task || !encounter || task.encounterId !== encounterId) nursingError("NURSING_TASK_NOT_FOUND", "The nursing task was not found.", 404);
      if (!isConsistentEncounterOrigin(encounter)) nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The Encounter visit source is inconsistent.", 409);
      const hasRecordedVitals = input.action === "COMPLETE" && (task.taskType === "RECORD_VITAL_SIGNS" || task.taskType === "REPEAT_VITAL_SIGNS")
        ? (await transaction.vitalSign.count({ where: { nursingTaskId: task.id } })) > 0
        : false;
      const decision = decideNurseTaskAction({
        nurseActive: nurse.status === "ACTIVE",
        nurseHasRole: nurse.roleAssignments.some((row) => row.role === "NURSE"),
        assignedToEmployeeId: task.assignedToEmployeeId,
        actorEmployeeId,
        encounterStatus: encounter.status,
        taskStatus: task.status,
        taskType: task.taskType,
        action: input.action,
        hasRecordedVitals,
      });
      if (decision.kind === "REJECT") mapPolicyError(decision.code);
      const now = new Date();
      // Unchecked update-many input is required for the server-controlled employee relation scalar fields.
      // The Encounter and task rows are locked above and the current status remains part of the WHERE clause.
      let updateData: Prisma.NursingTaskUncheckedUpdateManyInput;
      if (input.action === "START") updateData = { status: "IN_PROGRESS", startedAt: now };
      else if (input.action === "COMPLETE") updateData = { status: "COMPLETED", completedAt: now, completedByEmployeeId: actorEmployeeId };
      else updateData = {
        status: "ESCALATED",
        escalatedAt: now,
        escalationNote: input.escalationNote!,
        escalationResolvedAt: null,
        escalationResolvedByEmployeeId: null,
        escalationResolutionNote: null,
      };
      const updated = await transaction.nursingTask.updateMany({ where: { id: task.id, encounterId, assignedToEmployeeId: actorEmployeeId, status: task.status }, data: updateData });
      if (updated.count !== 1) nursingError("NURSING_TASK_STATE_CHANGED", "The nursing task changed. Refresh before trying again.", 409);
      if (input.action === "ESCALATE") {
        const doctor = await transaction.encounter.findUnique({ where: { id: encounterId }, select: { doctor: { select: { employeeId: true } } } });
        if (!doctor?.doctor.employeeId) nursingError("DOCTOR_PROFILE_REQUIRED", "The assigned Doctor could not be resolved.", 409);
        await transaction.notification.create({ data: {
          employeeId: doctor.doctor.employeeId,
          channel: "IN_APP",
          status: "PENDING",
          title: "Nursing task needs Doctor review",
          message: `A nursing task for Encounter ${encounterId} requires your review.`,
        } });
      }
      await transaction.auditLog.create({ data: {
        actorType: "EMPLOYEE", actorEmployeeId, action: `NURSING_TASK_${input.action}`, entityType: "NursingTask", entityId: task.id,
        reason: input.action === "ESCALATE" ? "NURSE_ESCALATED_FOR_DOCTOR_REVIEW" : null, occurredAt: now,
      } });
      return { taskId: task.id, status: input.action === "START" ? "IN_PROGRESS" : input.action === "COMPLETE" ? "COMPLETED" : "ESCALATED", occurredAt: now.toISOString() };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) nursingError("NURSING_TASK_CONFLICT", "The nursing task changed during this operation. Refresh and try again.", 409);
    throw error;
  }
}

export async function resolveDoctorNursingTask(encounterId: string, taskId: string, actorEmployeeId: string, input: ResolveNursingTaskRequest) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await lockEncounter(transaction, encounterId);
      const { employee, encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId);
      const taskLock = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "NursingTask" WHERE "id" = ${taskId} AND "encounterId" = ${encounterId} FOR UPDATE`;
      if (taskLock.length !== 1) nursingError("NURSING_TASK_NOT_FOUND", "The nursing task was not found for this Encounter.", 404);
      const task = await transaction.nursingTask.findUnique({ where: { id: taskId }, select: { id: true, encounterId: true, status: true } });
      const decision = decideDoctorNursingTaskResolution({
        doctorActive: employee.status === "ACTIVE",
        doctorHasRole: employee.roleAssignments.some((row) => row.role === "DOCTOR"),
        doctorProfileId: employee.doctorProfile?.id ?? null,
        encounterExists: true,
        encounterDoctorId: encounter.doctorId,
        encounterStatus: encounter.status,
        taskBelongsToEncounter: task?.encounterId === encounterId,
        taskStatus: task?.status ?? "CANCELLED",
        action: input.action,
      });
      if (decision.kind === "REJECT") mapPolicyError(decision.code);
      const now = new Date();
      const data = input.action === "RESUME"
        ? { status: "IN_PROGRESS" as const, escalationResolvedAt: now, escalationResolvedByEmployeeId: actorEmployeeId, escalationResolutionNote: input.note }
        : {
            status: "CANCELLED" as const,
            cancelledAt: now,
            cancelledByEmployeeId: actorEmployeeId,
            cancellationNote: input.note,
            ...(task!.status === "ESCALATED" ? { escalationResolvedAt: now, escalationResolvedByEmployeeId: actorEmployeeId, escalationResolutionNote: input.note } : {}),
          };
      const updated = await transaction.nursingTask.updateMany({ where: { id: taskId, encounterId, status: task!.status }, data });
      if (updated.count !== 1) nursingError("NURSING_TASK_STATE_CHANGED", "The nursing task changed. Refresh before trying again.", 409);
      await transaction.auditLog.create({ data: {
        actorType: "EMPLOYEE", actorEmployeeId, action: input.action === "RESUME" ? "NURSING_TASK_ESCALATION_RESUMED" : "NURSING_TASK_CANCELLED",
        entityType: "NursingTask", entityId: taskId, reason: input.action === "RESUME" ? "DOCTOR_REVIEWED_NURSING_ESCALATION" : "DOCTOR_CANCELLED_NURSING_TASK", occurredAt: now,
      } });
      return { taskId, status: input.action === "RESUME" ? "IN_PROGRESS" : "CANCELLED", occurredAt: now.toISOString() };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) nursingError("NURSING_TASK_CONFLICT", "The task changed during Doctor review. Refresh and try again.", 409);
    throw error;
  }
}

export async function getNurseTaskVitalSigns(taskId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  const employee = await prisma.employee.findUnique({ where: { id: actorEmployeeId }, select: { status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } } } });
  if (!employee || employee.status !== "ACTIVE" || !employee.roleAssignments.some((row) => row.role === "NURSE")) nursingError("NURSE_WORKSPACE_ACCESS_REQUIRED", "An active Nurse employee assignment is required.", 403);
  const task = await prisma.nursingTask.findFirst({
    where: { id: taskId, assignedToEmployeeId: actorEmployeeId },
    select: { id: true, taskType: true, status: true, encounter: { select: { id: true, status: true } }, vitalSigns: { orderBy: [{ measuredAt: "desc" }, { id: "desc" }], select: { id: true, measuredAt: true, temperatureC: true, systolicMmHg: true, diastolicMmHg: true, pulseBpm: true, respiratoryRatePerMin: true, oxygenSaturationPct: true, heightCm: true, weightKg: true, bmi: true, note: true } } },
  });
  if (!task) nursingError("NURSING_TASK_NOT_FOUND", "The task was not found for the authenticated Nurse.", 404);
  return { taskId: task.id, taskType: task.taskType, taskStatus: task.status, encounterStatus: task.encounter.status, vitalSigns: task.vitalSigns.map((v) => ({
    id: v.id, measuredAt: v.measuredAt.toISOString(), temperatureC: v.temperatureC === null ? null : Number(v.temperatureC), systolicMmHg: v.systolicMmHg,
    diastolicMmHg: v.diastolicMmHg, pulseBpm: v.pulseBpm, respiratoryRatePerMin: v.respiratoryRatePerMin,
    oxygenSaturationPct: v.oxygenSaturationPct === null ? null : Number(v.oxygenSaturationPct), heightCm: v.heightCm === null ? null : Number(v.heightCm),
    weightKg: v.weightKg === null ? null : Number(v.weightKg), bmi: v.bmi === null ? null : Number(v.bmi), note: v.note,
  })) };
}

export async function recordNurseTaskVitalSigns(taskId: string, actorEmployeeId: string, input: NurseVitalSignRequest) {
  const prisma = getPrismaClient();
  const encounterId = await findTaskEncounterId(taskId);
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await lockEncounter(transaction, encounterId);
      const nurse = await resolveNurse(transaction, actorEmployeeId);
      const taskLock = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "NursingTask" WHERE "id" = ${taskId} AND "encounterId" = ${encounterId} FOR UPDATE`;
      if (taskLock.length !== 1) nursingError("NURSING_TASK_NOT_FOUND", "The task was not found for the authenticated Nurse.", 404);
      const task = await transaction.nursingTask.findUnique({ where: { id: taskId }, select: { id: true, encounterId: true, assignedToEmployeeId: true, taskType: true, status: true } });
      const encounter = await transaction.encounter.findUnique({ where: { id: encounterId }, select: encounterSelect });
      if (!task || !encounter || task.assignedToEmployeeId !== actorEmployeeId) nursingError("NURSING_TASK_NOT_FOUND", "The task was not found for the authenticated Nurse.", 404);
      if (nurse.status !== "ACTIVE" || !nurse.roleAssignments.some((row) => row.role === "NURSE")) mapPolicyError("NURSE_WORKSPACE_ACCESS_REQUIRED");
      if (encounter.status !== "IN_PROGRESS") nursingError("ENCOUNTER_NOT_EDITABLE", "Vital signs can be added only to an active Encounter.", 409);
      if (!isConsistentEncounterOrigin(encounter)) nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The Encounter visit source is inconsistent.", 409);
      if (task.status !== "IN_PROGRESS" || (task.taskType !== "RECORD_VITAL_SIGNS" && task.taskType !== "REPEAT_VITAL_SIGNS")) {
        nursingError("VITAL_SIGN_TASK_REQUIRED", "Start an assigned vital-sign task before recording measurements.", 409);
      }
      const height = input.heightCm ?? null;
      const weight = input.weightKg ?? null;
      const bmi = height !== null && weight !== null ? Number((weight / ((height / 100) ** 2)).toFixed(2)) : null;
      const now = new Date();
      const vital = await transaction.vitalSign.create({
        data: {
          encounterId,
          nursingTaskId: taskId,
          recordedByEmployeeId: actorEmployeeId,
          measuredAt: now,
          temperatureC: input.temperatureC ?? null,
          systolicMmHg: input.systolicMmHg ?? null,
          diastolicMmHg: input.diastolicMmHg ?? null,
          pulseBpm: input.pulseBpm ?? null,
          respiratoryRatePerMin: input.respiratoryRatePerMin ?? null,
          oxygenSaturationPct: input.oxygenSaturationPct ?? null,
          heightCm: height,
          weightKg: weight,
          bmi,
          note: input.note ?? null,
        },
        select: { id: true, measuredAt: true, bmi: true },
      });
      await transaction.auditLog.create({ data: {
        actorType: "EMPLOYEE", actorEmployeeId, action: "NURSING_VITAL_SIGNS_RECORDED", entityType: "VitalSign", entityId: vital.id,
        reason: "VITAL_SIGNS_RECORDED_FROM_ASSIGNED_NURSING_TASK", occurredAt: now,
      } });
      return { vitalSign: { id: vital.id, measuredAt: vital.measuredAt.toISOString(), bmi: vital.bmi === null ? null : Number(vital.bmi) } };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) nursingError("NURSING_TASK_CONFLICT", "The nursing task changed while recording vital signs. Refresh and try again.", 409);
    throw error;
  }
}

export async function completeDoctorEncounter(encounterId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await lockEncounter(transaction, encounterId);
      const { employee, encounter } = await resolveDoctorEncounter(transaction, encounterId, actorEmployeeId);
      const initialNotes = await transaction.clinicalNote.findMany({
        where: { encounterId, type: "INITIAL_ASSESSMENT" },
        select: { id: true, status: true, signedAt: true, authorEmployeeId: true },
      });
      const openNursingTaskCount = await transaction.nursingTask.count({ where: { encounterId, status: { in: ["PENDING", "IN_PROGRESS", "ESCALATED"] } } });
      const draftPrescriptionCount = await transaction.prescription.count({ where: { encounterId, status: "DRAFT" } });
      const note = initialNotes.length === 1 ? initialNotes[0] : null;
      const decision = decideDoctorEncounterCompletion({
        doctorActive: employee.status === "ACTIVE",
        doctorHasRole: employee.roleAssignments.some((row) => row.role === "DOCTOR"),
        doctorProfileId: employee.doctorProfile?.id ?? null,
        encounterExists: true,
        encounterDoctorId: encounter.doctorId,
        encounterStatus: encounter.status,
        completedAtExists: encounter.completedAt !== null,
        encounterSourceConsistent: isConsistentEncounterOrigin(encounter),
        signedInitialNoteCount: note?.status === "SIGNED" && note.signedAt !== null ? 1 : 0,
        signedInitialNoteAuthorEmployeeId: note?.authorEmployeeId ?? null,
        actorEmployeeId,
        openNursingTaskCount,
        draftPrescriptionCount,
      });
      if (decision.kind === "REJECT") mapPolicyError(decision.code);
      const now = new Date();
      if (encounter.appointmentId) {
        const appointmentQueue = encounter.appointment?.queueEntry;
        if (!appointmentQueue || appointmentQueue.appointmentId !== encounter.appointmentId) {
          nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The appointment's queue ticket is unavailable.", 409);
        }
        // The consultation-start workflow locks QueueEntry before Appointment.
        // Keep the same lock order so completion updates both records atomically.
        const queueLock = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "QueueEntry" WHERE "id" = ${appointmentQueue.id} FOR UPDATE`;
        if (queueLock.length !== 1) nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The appointment queue ticket is unavailable.", 409);
        const queue = await transaction.queueEntry.findUnique({ where: { id: appointmentQueue.id }, select: { id: true, patientId: true, doctorId: true, appointmentId: true, type: true, status: true, serviceStartedAt: true, completedAt: true } });
        if (!queue || queue.patientId !== encounter.patientId || queue.doctorId !== encounter.doctorId || queue.appointmentId !== encounter.appointmentId || queue.type !== "APPOINTMENT" || queue.status !== "IN_SERVICE" || queue.serviceStartedAt === null || queue.completedAt !== null) {
          nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The appointment queue ticket is no longer in service.", 409);
        }
        const appointmentLock = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Appointment" WHERE "id" = ${encounter.appointmentId} FOR UPDATE`;
        if (appointmentLock.length !== 1) nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The linked appointment is unavailable.", 409);
        const appointment = await transaction.appointment.findUnique({
          where: { id: encounter.appointmentId },
          select: { id: true, patientId: true, doctorId: true, status: true, completedAt: true, queueEntry: { select: { id: true } } },
        });
        if (!appointment || appointment.patientId !== encounter.patientId || appointment.doctorId !== encounter.doctorId || appointment.status !== "IN_CONSULTATION" || appointment.completedAt !== null || appointment.queueEntry?.id !== queue.id) {
          nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The linked appointment is no longer in consultation.", 409);
        }
        const changedQueue = await transaction.queueEntry.updateMany({ where: { id: queue.id, appointmentId: encounter.appointmentId, type: "APPOINTMENT", status: "IN_SERVICE", completedAt: null }, data: { status: "COMPLETED", completedAt: now } });
        if (changedQueue.count !== 1) nursingError("ENCOUNTER_STATE_CHANGED", "The appointment queue ticket changed while closing the Encounter.", 409);
        const changed = await transaction.appointment.updateMany({ where: { id: appointment.id, status: "IN_CONSULTATION", completedAt: null }, data: { status: "COMPLETED", completedAt: now } });
        if (changed.count !== 1) nursingError("ENCOUNTER_STATE_CHANGED", "The appointment changed while closing the Encounter.", 409);
        await transaction.appointmentStatusHistory.create({ data: {
          appointmentId: appointment.id, fromStatus: "IN_CONSULTATION", toStatus: "COMPLETED", changeSource: "STAFF", changedByEmployeeId: actorEmployeeId,
          reason: "DOCTOR_COMPLETED_ENCOUNTER", changedAt: now,
        } });
      } else if (encounter.queueEntryId) {
        const queueLock = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "QueueEntry" WHERE "id" = ${encounter.queueEntryId} FOR UPDATE`;
        if (queueLock.length !== 1) nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The linked walk-in queue ticket is unavailable.", 409);
        const queue = await transaction.queueEntry.findUnique({ where: { id: encounter.queueEntryId }, select: { id: true, patientId: true, doctorId: true, appointmentId: true, type: true, status: true, serviceStartedAt: true, completedAt: true } });
        if (!queue || queue.patientId !== encounter.patientId || queue.doctorId !== encounter.doctorId || queue.appointmentId !== null || queue.type !== "WALK_IN" || queue.status !== "IN_SERVICE" || queue.serviceStartedAt === null || queue.completedAt !== null) {
          nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The linked walk-in queue ticket is no longer in service.", 409);
        }
        const changed = await transaction.queueEntry.updateMany({ where: { id: queue.id, status: "IN_SERVICE", completedAt: null }, data: { status: "COMPLETED", completedAt: now } });
        if (changed.count !== 1) nursingError("ENCOUNTER_STATE_CHANGED", "The walk-in queue ticket changed while closing the Encounter.", 409);
      } else {
        nursingError("ENCOUNTER_SOURCE_INCONSISTENT", "The Encounter has no supported visit source.", 409);
      }
      const changedEncounter = await transaction.encounter.updateMany({ where: { id: encounterId, status: "IN_PROGRESS", completedAt: null }, data: { status: "COMPLETED", completedAt: now } });
      if (changedEncounter.count !== 1) nursingError("ENCOUNTER_STATE_CHANGED", "The Encounter changed while it was being closed.", 409);
      await transaction.auditLog.create({ data: {
        actorType: "EMPLOYEE", actorEmployeeId, action: "DOCTOR_ENCOUNTER_COMPLETED", entityType: "Encounter", entityId: encounterId,
        reason: "SIGNED_INITIAL_NOTE_AND_WORKFLOW_REQUIREMENTS_MET", occurredAt: now,
      } });
      return {
        encounter: { id: encounterId, status: "COMPLETED", completedAt: now.toISOString() },
        appointmentId: encounter.appointmentId,
        queueEntryId: encounter.queueEntryId ?? encounter.appointment?.queueEntry?.id ?? null,
      };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isPrismaCode(error, "P2034")) nursingError("ENCOUNTER_COMPLETION_CONFLICT", "The Encounter changed during completion. Refresh and try again.", 409);
    throw error;
  }
}
