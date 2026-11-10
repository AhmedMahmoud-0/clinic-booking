import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import type { DoctorReferralLifecycleRequest } from "./doctor-referral-lifecycle-validation";
import {
  decideDoctorReferralLifecycleTransition,
  isDoctorReferralInboxVisible,
} from "./doctor-referral-lifecycle-policy";

export class DoctorReferralLifecycleError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "DoctorReferralLifecycleError";
    this.code = code;
    this.status = status;
  }
}

type Transaction = Prisma.TransactionClient;

function lifecycleError(code: string, message: string, status: number): never {
  throw new DoctorReferralLifecycleError(code, message, status);
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
type ResolvedDoctorEmployeeSource = EmployeeSource & { doctorProfile: NonNullable<EmployeeSource["doctorProfile"]> };

const inboxReferralSelect = {
  id: true,
  type: true,
  status: true,
  reason: true,
  instructions: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  referredToSpecialty: { select: { id: true, code: true, name: true } },
  referredToDoctor: {
    select: {
      id: true,
      publicDisplayName: true,
      professionalTitle: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  },
  createdByEmployee: { select: { id: true, firstName: true, lastName: true } },
  encounter: {
    select: {
      id: true,
      startedAt: true,
      patient: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          preferredName: true,
          mrn: true,
          isActive: true,
        },
      },
      doctor: {
        select: {
          publicDisplayName: true,
          professionalTitle: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  },
} satisfies Prisma.ReferralSelect;

type InboxReferralSource = Prisma.ReferralGetPayload<{ select: typeof inboxReferralSelect }>;

function displayEmployeeName(employee: { firstName: string; lastName: string }): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function displayDoctorName(doctor: {
  publicDisplayName: string | null;
  professionalTitle: string | null;
  employee: { firstName: string; lastName: string };
}): string {
  const publicName = doctor.publicDisplayName?.trim();
  if (publicName) return publicName;
  return [doctor.professionalTitle, displayEmployeeName(doctor.employee)]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
}

function toInboxReferralDto(referral: InboxReferralSource) {
  const patient = referral.encounter.patient;
  const patientName = patient.preferredName?.trim()
    || [patient.firstName, patient.middleName, patient.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(" ");

  return {
    id: referral.id,
    type: referral.type,
    status: referral.status,
    reason: referral.reason,
    instructions: referral.instructions,
    createdAt: referral.createdAt.toISOString(),
    updatedAt: referral.updatedAt.toISOString(),
    completedAt: referral.completedAt?.toISOString() ?? null,
    target: {
      specialty: referral.referredToSpecialty,
      doctor: referral.referredToDoctor
        ? {
            id: referral.referredToDoctor.id,
            displayName: displayDoctorName(referral.referredToDoctor),
            professionalTitle: referral.referredToDoctor.professionalTitle,
          }
        : null,
    },
    patient: {
      id: patient.id,
      name: patientName,
      mrn: patient.mrn,
      isActive: patient.isActive,
    },
    source: {
      encounterId: referral.encounter.id,
      encounterStartedAt: referral.encounter.startedAt.toISOString(),
      doctorName: displayDoctorName(referral.encounter.doctor),
      referringEmployeeName: displayEmployeeName(referral.createdByEmployee),
    },
  };
}

function mapLifecycleRejection(code: string): never {
  const errors: Record<string, { message: string; status: number }> = {
    DOCTOR_WORKSPACE_ACCESS_REQUIRED: {
      message: "An active Doctor employee assignment is required for this operation.",
      status: 403,
    },
    DOCTOR_PROFILE_REQUIRED: {
      message: "The active Doctor employee does not have a linked Doctor profile.",
      status: 403,
    },
    REFERRAL_NOT_FOUND: {
      message: "The referral was not found.",
      status: 404,
    },
    REFERRAL_ACTION_NOT_SUPPORTED: {
      message: "External referrals cannot be accepted or completed inside this clinic workspace.",
      status: 409,
    },
    REFERRAL_NOT_ASSIGNED_TO_DOCTOR: {
      message: "The referral is not assigned to the authenticated Doctor or one of their active specialties.",
      status: 404,
    },
    REFERRAL_NOT_CREATED_BY_DOCTOR: {
      message: "Only the Doctor who created this referral can cancel it.",
      status: 403,
    },
    REFERRAL_STATUS_TRANSITION_INVALID: {
      message: "The referral is not in a state that permits this action.",
      status: 409,
    },
  };
  const error = errors[code] ?? { message: "The referral lifecycle operation could not be completed.", status: 409 };
  lifecycleError(code, error.message, error.status);
}

async function resolveDoctor(transaction: Transaction, actorEmployeeId: string): Promise<ResolvedDoctorEmployeeSource> {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: employeeSelect,
  });
  if (
    !employee
    || employee.status !== "ACTIVE"
    || !employee.roleAssignments.some((assignment) => assignment.role === "DOCTOR")
  ) {
    mapLifecycleRejection("DOCTOR_WORKSPACE_ACCESS_REQUIRED");
  }
  const doctorProfile = employee.doctorProfile;
  if (!doctorProfile) mapLifecycleRejection("DOCTOR_PROFILE_REQUIRED");
  return { ...employee, doctorProfile };
}

async function getActiveSpecialtyIds(transaction: Transaction, doctorProfileId: string): Promise<string[]> {
  const specialties = await transaction.specialty.findMany({
    where: {
      isActive: true,
      doctors: { some: { doctorId: doctorProfileId } },
    },
    select: { id: true },
  });
  return specialties.map((specialty) => specialty.id);
}

/** Return only open internal referrals explicitly addressed to this Doctor or their active specialty. */
export async function getDoctorReferralInbox(actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const employee = await resolveDoctor(transaction, actorEmployeeId);
    const doctorProfileId = employee.doctorProfile.id;
    const activeSpecialtyIds = await getActiveSpecialtyIds(transaction, doctorProfileId);

    const recipientBranches: Prisma.ReferralWhereInput[] = [
      activeSpecialtyIds.length > 0
        ? {
            referredToDoctorId: doctorProfileId,
            OR: [
              { referredToSpecialtyId: null },
              { referredToSpecialtyId: { in: activeSpecialtyIds } },
            ],
          }
        : { referredToDoctorId: doctorProfileId, referredToSpecialtyId: null },
    ];
    if (activeSpecialtyIds.length > 0) {
      recipientBranches.push({
        referredToDoctorId: null,
        referredToSpecialtyId: { in: activeSpecialtyIds },
      });
    }
    const recipientFilter: Prisma.ReferralWhereInput = { OR: recipientBranches };

    const referrals = await transaction.referral.findMany({
      where: {
        type: "INTERNAL",
        status: { in: ["PENDING", "ACCEPTED"] },
        ...recipientFilter,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: inboxReferralSelect,
    });

    const visible = referrals.filter((referral) => isDoctorReferralInboxVisible({
      employeeStatus: employee.status,
      activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
      doctorProfileId,
      activeSpecialtyIds,
      referralType: referral.type,
      referralStatus: referral.status,
      referredToDoctorId: referral.referredToDoctor?.id ?? null,
      referredToSpecialtyId: referral.referredToSpecialty?.id ?? null,
    }));

    return {
      doctorProfileId,
      referrals: visible.map(toInboxReferralDto),
    };
  }, { isolationLevel: "RepeatableRead", maxWait: 5_000, timeout: 15_000 });
}

/** Apply one permitted lifecycle transition with row locking and an atomic audit event. */
export async function transitionDoctorReferral(
  referralId: string,
  actorEmployeeId: string,
  input: DoctorReferralLifecycleRequest,
) {
  const prisma = getPrismaClient();
  try {
    return await prisma.$transaction(async (transaction: Transaction) => {
      await resolveDoctor(transaction, actorEmployeeId);
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Referral" WHERE "id" = ${referralId} FOR UPDATE
      `;
      if (locked.length !== 1) mapLifecycleRejection("REFERRAL_NOT_FOUND");

      // Re-resolve the actor after the lock so revoked roles or deactivated employees fail closed.
      const employee = await resolveDoctor(transaction, actorEmployeeId);
      const doctorProfileId = employee.doctorProfile.id;
      const activeSpecialtyIds = await getActiveSpecialtyIds(transaction, doctorProfileId);
      const referral = await transaction.referral.findUnique({
        where: { id: referralId },
        select: {
          id: true,
          type: true,
          status: true,
          createdByEmployeeId: true,
          referredToDoctorId: true,
          referredToSpecialtyId: true,
        },
      });

      const decision = decideDoctorReferralLifecycleTransition({
        employeeId: employee.id,
        employeeStatus: employee.status,
        activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
        doctorProfileId,
        activeSpecialtyIds,
        referralExists: referral !== null,
        referralType: referral?.type ?? null,
        referralStatus: referral?.status ?? null,
        createdByEmployeeId: referral?.createdByEmployeeId ?? null,
        referredToDoctorId: referral?.referredToDoctorId ?? null,
        referredToSpecialtyId: referral?.referredToSpecialtyId ?? null,
        action: input.action,
      });
      if (decision.kind === "REJECT") mapLifecycleRejection(decision.code);
      if (!referral) mapLifecycleRejection("REFERRAL_NOT_FOUND");

      const now = new Date();
      const updated = await transaction.referral.update({
        where: { id: referral.id },
        data: {
          status: decision.nextStatus,
          completedAt: decision.nextStatus === "COMPLETED" ? now : null,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          completedAt: true,
        },
      });

      const actionByStatus = {
        ACCEPTED: "DOCTOR_REFERRAL_ACCEPTED",
        COMPLETED: "DOCTOR_REFERRAL_COMPLETED",
        CANCELLED: "DOCTOR_REFERRAL_CANCELLED",
      } as const;
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId: employee.id,
          action: actionByStatus[decision.nextStatus],
          entityType: "Referral",
          entityId: referral.id,
          reason: `Doctor changed referral status from ${decision.previousStatus} to ${decision.nextStatus}. Clinical referral details are not copied into the audit log.`,
          occurredAt: now,
        },
      });

      return {
        outcome: "UPDATED" as const,
        referral: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
          completedAt: updated.completedAt?.toISOString() ?? null,
        },
        previousStatus: decision.previousStatus,
        action: input.action,
      };
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
  } catch (error) {
    if (error instanceof DoctorReferralLifecycleError) throw error;
    if (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002") || isPrismaCode(error, "P2025")) {
      lifecycleError(
        "DOCTOR_REFERRAL_CONCURRENT_CHANGE",
        "The referral changed concurrently. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
