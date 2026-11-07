import "server-only";

import { getPrismaClient } from "../../db/client";
import { calculatePatientAge } from "../authorization/delegation-policy";
import type { PatientAccessScope } from "../authorization/types";
import { AccountLinkError } from "../account-linking/common";
import type {
  CreatePatientDelegationInput,
  PatientDelegationDecisionInput,
  UpdatePatientDelegationInput,
} from "./patient-delegation-validation";
import { isPatientDelegationExpiryAllowed } from "./patient-delegation-validation";

const verifiedPatientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  isActive: true,
  dateOfBirth: true,
  authAccount: {
    select: {
      verifiedAt: true,
      user: { select: { emailVerified: true } },
    },
  },
} as const;

const relationshipSelect = {
  relationshipType: true,
  isLegalGuardian: true,
  guardianVerifiedAt: true,
  guardianVerifiedByEmployeeId: true,
} as const;

type VerifiedPatientRecord = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  dateOfBirth: Date | null;
  authAccount: {
    verifiedAt: Date | null;
    user: { emailVerified: boolean };
  } | null;
};

function hasVerifiedPatientAccount(patient: VerifiedPatientRecord): boolean {
  return Boolean(patient.authAccount?.verifiedAt && patient.authAccount.user.emailVerified);
}

function assertExpiry(expiresAt: string, now: Date): Date {
  const parsed = new Date(expiresAt);
  if (!isPatientDelegationExpiryAllowed(parsed, now)) {
    throw new AccountLinkError(
      "PATIENT_DELEGATION_EXPIRY_INVALID",
      "The delegation expiry must be in the future and no more than 365 days away.",
      400,
    );
  }
  return parsed;
}

function assertScopes(scopes: readonly string[]): asserts scopes is readonly PatientAccessScope[] {
  if (scopes.length === 0 || new Set(scopes).size !== scopes.length) {
    throw new AccountLinkError(
      "PATIENT_DELEGATION_SCOPES_INVALID",
      "Select one or more unique patient access scopes.",
      400,
    );
  }
}

function auditDetails(
  reason: string,
  scopes: readonly string[],
  expiresAt: Date,
  previousScopes?: readonly string[],
): string {
  const details = [
    `reason=${reason}`,
    previousScopes ? `previousScopes=${previousScopes.join(",")}` : null,
    `scopes=${scopes.join(",")}`,
    `expiresAt=${expiresAt.toISOString()}`,
  ].filter((value): value is string => value !== null);

  return details.join("; ").slice(0, 500);
}

function translateDatabaseConflict(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2002" || error.code === "P2003" || error.code === "P2034" || error.code === "P2025")
  ) {
    throw new AccountLinkError(
      "PATIENT_DELEGATION_CONFLICT",
      "The patient delegation changed concurrently or conflicts with an existing grant. Refresh the grant list and try again.",
      409,
    );
  }

  throw error;
}

function ensurePatientsCanBeDelegated(
  subject: VerifiedPatientRecord,
  grantee: VerifiedPatientRecord,
  relationship: {
    relationshipType: string;
    isLegalGuardian: boolean;
    guardianVerifiedAt: Date | null;
    guardianVerifiedByEmployeeId: string | null;
  } | null,
  now: Date,
): { isMinor: boolean } {
  if (!subject.isActive || !grantee.isActive) {
    throw new AccountLinkError(
      "ACTIVE_PATIENTS_REQUIRED",
      "Both patient records must be active before delegation can be managed.",
      409,
    );
  }

  if (subject.id === grantee.id) {
    throw new AccountLinkError(
      "PATIENT_DELEGATION_SELF_LINK_NOT_ALLOWED",
      "A patient cannot delegate access to their own record.",
      400,
    );
  }

  if (!relationship) {
    throw new AccountLinkError(
      "PATIENT_RELATIONSHIP_REQUIRED",
      "A verified patient relationship record is required before access can be delegated.",
      409,
    );
  }

  if (!hasVerifiedPatientAccount(grantee)) {
    throw new AccountLinkError(
      "DELEGATE_PATIENT_ACCOUNT_REQUIRED",
      "The person receiving access must have an active, verified patient sign-in account.",
      409,
    );
  }

  const age = calculatePatientAge(subject.dateOfBirth, now);
  if (age === null) {
    throw new AccountLinkError(
      "SUBJECT_DATE_OF_BIRTH_REQUIRED",
      "The patient's date of birth must be verified before delegated access can be managed.",
      409,
    );
  }

  const isMinor = age < 18;
  if (isMinor) {
    if (
      !relationship.isLegalGuardian ||
      !relationship.guardianVerifiedAt ||
      !relationship.guardianVerifiedByEmployeeId
    ) {
      throw new AccountLinkError(
        "VERIFIED_LEGAL_GUARDIAN_REQUIRED",
        "A legally documented and staff-verified guardian relationship is required for a minor.",
        409,
      );
    }
  } else if (!hasVerifiedPatientAccount(subject)) {
    throw new AccountLinkError(
      "SUBJECT_PATIENT_ACCOUNT_REQUIRED",
      "The adult patient must have an active, verified patient sign-in account to approve delegated access.",
      409,
    );
  }

  return { isMinor };
}

/**
 * Creates or renews one directed grant for an existing patient relationship.
 * Minor grants activate only after staff-verified legal guardianship; adult
 * grants remain pending until the subject patient explicitly approves them.
 */
export async function createPatientAccessGrant(
  input: CreatePatientDelegationInput,
  actorEmployeeId: string,
): Promise<{
  grantId: string;
  status: "ACTIVE" | "PENDING";
  scopes: PatientAccessScope[];
  expiresAt: Date;
  requiresSubjectApproval: boolean;
}> {
  const prisma = getPrismaClient();
  const now = new Date();
  const expiresAt = assertExpiry(input.expiresAt, now);
  assertScopes(input.scopes);

  try {
    return await prisma.$transaction(async (transaction) => {
      const [subject, grantee, relationship] = await Promise.all([
        transaction.patient.findUnique({
          where: { id: input.subjectPatientId },
          select: verifiedPatientSelect,
        }),
        transaction.patient.findUnique({
          where: { id: input.granteePatientId },
          select: verifiedPatientSelect,
        }),
        transaction.patientRelationship.findUnique({
          where: {
            patientId_relatedPatientId: {
              patientId: input.subjectPatientId,
              relatedPatientId: input.granteePatientId,
            },
          },
          select: relationshipSelect,
        }),
      ]);

      if (!subject || !grantee) {
        throw new AccountLinkError(
          "PATIENT_RELATIONSHIP_NOT_FOUND",
          "The patient relationship could not be verified.",
          404,
        );
      }

      const { isMinor } = ensurePatientsCanBeDelegated(subject, grantee, relationship, now);
      const status: "ACTIVE" | "PENDING" = isMinor ? "ACTIVE" : "PENDING";
      const existing = await transaction.patientAccessGrant.findUnique({
        where: {
          subjectPatientId_granteePatientId: {
            subjectPatientId: subject.id,
            granteePatientId: grantee.id,
          },
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          permissions: { select: { scope: true } },
        },
      });

      const existingStillUsable = Boolean(
        existing &&
          (existing.status === "ACTIVE" || existing.status === "PENDING") &&
          (!existing.expiresAt || existing.expiresAt.getTime() > now.getTime()),
      );
      if (existingStillUsable) {
        throw new AccountLinkError(
          "PATIENT_DELEGATION_ALREADY_EXISTS",
          "A pending or active delegation already exists for this patient relationship. Update or revoke that grant instead.",
          409,
        );
      }

      const grant = existing
        ? await transaction.patientAccessGrant.update({
            where: { id: existing.id },
            data: {
              requestedByEmployeeId: actorEmployeeId,
              approvedByPatientId: null,
              approvedAt: null,
              verifiedByEmployeeId: actorEmployeeId,
              status,
              reason: input.reason,
              requestedAt: now,
              verifiedAt: now,
              expiresAt,
              revokedAt: null,
            },
            select: { id: true },
          })
        : await transaction.patientAccessGrant.create({
            data: {
              subjectPatientId: subject.id,
              granteePatientId: grantee.id,
              requestedByEmployeeId: actorEmployeeId,
              verifiedByEmployeeId: actorEmployeeId,
              status,
              reason: input.reason,
              requestedAt: now,
              verifiedAt: now,
              expiresAt,
            },
            select: { id: true },
          });

      await transaction.patientAccessGrantPermission.deleteMany({
        where: { grantId: grant.id },
      });
      await transaction.patientAccessGrantPermission.createMany({
        data: input.scopes.map((scope) => ({ grantId: grant.id, scope })),
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: existing ? "PATIENT_ACCESS_GRANT_REISSUED" : "PATIENT_ACCESS_GRANT_REQUESTED",
          entityType: "PatientAccessGrant",
          entityId: grant.id,
          reason: auditDetails(input.reason, input.scopes, expiresAt),
          occurredAt: now,
        },
      });

      return {
        grantId: grant.id,
        status,
        scopes: [...input.scopes],
        expiresAt,
        requiresSubjectApproval: !isMinor,
      };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    translateDatabaseConflict(error);
  }
}

/** Return a minimal staff DTO; an expired date is presented as EXPIRED immediately. */
export async function listPatientAccessGrants(subjectPatientId: string): Promise<{
  subject: { id: string; firstName: string; lastName: string };
  grants: Array<{
    id: string;
    grantee: { id: string; firstName: string; lastName: string };
    relationshipType: string;
    isLegalGuardian: boolean;
    status: string;
    scopes: PatientAccessScope[];
    requestedAt: Date;
    approvedAt: Date | null;
    verifiedAt: Date | null;
    expiresAt: Date | null;
    revokedAt: Date | null;
    reason: string | null;
  }>;
}> {
  const prisma = getPrismaClient();
  const subject = await prisma.patient.findUnique({
    where: { id: subjectPatientId },
    select: { id: true, firstName: true, lastName: true, isActive: true },
  });

  if (!subject || !subject.isActive) {
    throw new AccountLinkError(
      "ACTIVE_SUBJECT_PATIENT_REQUIRED",
      "The active subject patient record could not be found.",
      404,
    );
  }

  const now = new Date();
  const records = await prisma.patientAccessGrant.findMany({
    where: { subjectPatientId },
    orderBy: { requestedAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      requestedAt: true,
      approvedAt: true,
      verifiedAt: true,
      expiresAt: true,
      revokedAt: true,
      reason: true,
      granteePatient: { select: { id: true, firstName: true, lastName: true } },
      relationship: { select: { relationshipType: true, isLegalGuardian: true } },
      permissions: { select: { scope: true } },
    },
  });

  return {
    subject: { id: subject.id, firstName: subject.firstName, lastName: subject.lastName },
    grants: records.map((record) => ({
      id: record.id,
      grantee: record.granteePatient,
      relationshipType: record.relationship.relationshipType,
      isLegalGuardian: record.relationship.isLegalGuardian,
      status:
        (record.status === "ACTIVE" || record.status === "PENDING") &&
        record.expiresAt !== null &&
        record.expiresAt.getTime() <= now.getTime()
          ? "EXPIRED"
          : record.status,
      scopes: record.permissions.map((permission) => permission.scope as PatientAccessScope),
      requestedAt: record.requestedAt,
      approvedAt: record.approvedAt,
      verifiedAt: record.verifiedAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      reason: record.reason,
    })),
  };
}

/** List only the grants in which the authenticated patient is the subject or delegate. */
export async function listPatientDelegationsForActor(patientId: string): Promise<{
  grants: Array<{
    id: string;
    direction: "OUTGOING" | "INCOMING";
    subject: { id: string; firstName: string; lastName: string };
    grantee: { id: string; firstName: string; lastName: string };
    relationshipType: string;
    isLegalGuardian: boolean;
    status: string;
    scopes: PatientAccessScope[];
    requestedAt: Date;
    approvedAt: Date | null;
    expiresAt: Date | null;
    revokedAt: Date | null;
    canDecide: boolean;
    canRevoke: boolean;
  }>;
}> {
  const prisma = getPrismaClient();
  const now = new Date();
  const records = await prisma.patientAccessGrant.findMany({
    where: { OR: [{ subjectPatientId: patientId }, { granteePatientId: patientId }] },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      subjectPatientId: true,
      status: true,
      requestedAt: true,
      approvedAt: true,
      expiresAt: true,
      revokedAt: true,
      subjectPatient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
      granteePatient: { select: { id: true, firstName: true, lastName: true } },
      relationship: { select: { relationshipType: true, isLegalGuardian: true } },
      permissions: { select: { scope: true } },
    },
  });

  return {
    grants: records.map((record) => {
      const direction = record.subjectPatientId === patientId ? "OUTGOING" : "INCOMING";
      const subjectAge = calculatePatientAge(record.subjectPatient.dateOfBirth, now);
      const status =
        (record.status === "ACTIVE" || record.status === "PENDING") &&
        record.expiresAt !== null &&
        record.expiresAt.getTime() <= now.getTime()
          ? "EXPIRED"
          : record.status;

      return {
        id: record.id,
        direction,
        subject: record.subjectPatient,
        grantee: record.granteePatient,
        relationshipType: record.relationship.relationshipType,
        isLegalGuardian: record.relationship.isLegalGuardian,
        status,
        scopes: record.permissions.map((permission) => permission.scope as PatientAccessScope),
        requestedAt: record.requestedAt,
        approvedAt: record.approvedAt,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        canDecide:
          direction === "OUTGOING" &&
          status === "PENDING" &&
          subjectAge !== null &&
          subjectAge >= 18 &&
          record.expiresAt !== null &&
          record.expiresAt.getTime() > now.getTime(),
        canRevoke: direction === "OUTGOING" && (status === "ACTIVE" || status === "PENDING"),
      };
    }),
  };
}

/** Update the exact scope set and expiry. Adult changes return the grant to PENDING. */
export async function updatePatientAccessGrant(
  grantId: string,
  input: UpdatePatientDelegationInput,
  actorEmployeeId: string,
): Promise<{ grantId: string; status: "ACTIVE" | "PENDING"; scopes: PatientAccessScope[]; expiresAt: Date }> {
  const prisma = getPrismaClient();
  const now = new Date();
  const expiresAt = assertExpiry(input.expiresAt, now);
  assertScopes(input.scopes);

  try {
    return await prisma.$transaction(async (transaction) => {
      const grant = await transaction.patientAccessGrant.findUnique({
        where: { id: grantId },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          subjectPatient: { select: verifiedPatientSelect },
          granteePatient: { select: verifiedPatientSelect },
          relationship: { select: relationshipSelect },
          permissions: { select: { scope: true } },
        },
      });

      if (!grant) {
        throw new AccountLinkError("PATIENT_DELEGATION_NOT_FOUND", "The patient delegation was not found.", 404);
      }
      if (grant.status !== "ACTIVE" && grant.status !== "PENDING") {
        throw new AccountLinkError("PATIENT_DELEGATION_NOT_EDITABLE", "Only pending or active delegations can be updated.", 409);
      }
      if (grant.expiresAt && grant.expiresAt.getTime() <= now.getTime()) {
        throw new AccountLinkError("PATIENT_DELEGATION_EXPIRED", "The delegation has expired. Create a new request instead.", 410);
      }

      const { isMinor } = ensurePatientsCanBeDelegated(
        grant.subjectPatient,
        grant.granteePatient,
        grant.relationship,
        now,
      );
      const previousScopes = grant.permissions.map((permission) => permission.scope as PatientAccessScope);
      const status: "ACTIVE" | "PENDING" = isMinor ? "ACTIVE" : "PENDING";

      await transaction.patientAccessGrant.update({
        where: { id: grant.id },
        data: {
          status,
          reason: input.reason,
          verifiedAt: now,
          verifiedByEmployeeId: actorEmployeeId,
          approvedByPatientId: null,
          approvedAt: null,
          expiresAt,
        },
      });
      await transaction.patientAccessGrantPermission.deleteMany({ where: { grantId: grant.id } });
      await transaction.patientAccessGrantPermission.createMany({
        data: input.scopes.map((scope) => ({ grantId: grant.id, scope })),
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "PATIENT_ACCESS_GRANT_UPDATED",
          entityType: "PatientAccessGrant",
          entityId: grant.id,
          reason: auditDetails(input.reason, input.scopes, expiresAt, previousScopes),
          occurredAt: now,
        },
      });

      return { grantId: grant.id, status, scopes: [...input.scopes], expiresAt };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    translateDatabaseConflict(error);
  }
}

async function revokeGrant(
  grantId: string,
  reason: string,
  actor: { type: "EMPLOYEE"; employeeId: string } | { type: "PATIENT"; patientId: string },
): Promise<void> {
  const prisma = getPrismaClient();
  const now = new Date();

  try {
    await prisma.$transaction(async (transaction) => {
      const grant = await transaction.patientAccessGrant.findUnique({
        where: { id: grantId },
        select: { id: true, subjectPatientId: true, status: true },
      });

      if (!grant) {
        throw new AccountLinkError("PATIENT_DELEGATION_NOT_FOUND", "The patient delegation was not found.", 404);
      }
      if (actor.type === "PATIENT" && actor.patientId !== grant.subjectPatientId) {
        throw new AccountLinkError("PATIENT_DELEGATION_OWNER_REQUIRED", "Only the subject patient can revoke this delegation.", 403);
      }
      if (grant.status !== "ACTIVE" && grant.status !== "PENDING") {
        throw new AccountLinkError("PATIENT_DELEGATION_NOT_REVOCABLE", "Only pending or active delegations can be revoked.", 409);
      }

      await transaction.patientAccessGrant.update({
        where: { id: grant.id },
        data: { status: "REVOKED", revokedAt: now },
      });
      await transaction.auditLog.create({
        data: {
          actorType: actor.type === "EMPLOYEE" ? "EMPLOYEE" : "EXTERNAL",
          actorEmployeeId: actor.type === "EMPLOYEE" ? actor.employeeId : null,
          action: "PATIENT_ACCESS_GRANT_REVOKED",
          entityType: "PatientAccessGrant",
          entityId: grant.id,
          reason: actor.type === "PATIENT"
            ? `subjectPatientId=${actor.patientId}; reason=${reason}`.slice(0, 500)
            : reason.slice(0, 500),
          occurredAt: now,
        },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    translateDatabaseConflict(error);
  }
}

export async function revokePatientAccessGrantByEmployee(
  grantId: string,
  reason: string,
  actorEmployeeId: string,
): Promise<void> {
  return revokeGrant(grantId, reason, { type: "EMPLOYEE", employeeId: actorEmployeeId });
}

export async function revokePatientAccessGrantBySubject(
  grantId: string,
  reason: string,
  actorPatientId: string,
): Promise<void> {
  return revokeGrant(grantId, reason, { type: "PATIENT", patientId: actorPatientId });
}

/** Adult subject patients alone may approve or reject a pending delegation request. */
export async function decidePatientAccessGrant(
  grantId: string,
  input: PatientDelegationDecisionInput,
  actorPatientId: string,
): Promise<{ grantId: string; status: "ACTIVE" | "REJECTED" }> {
  const prisma = getPrismaClient();
  const now = new Date();

  try {
    return await prisma.$transaction(async (transaction) => {
      const grant = await transaction.patientAccessGrant.findUnique({
        where: { id: grantId },
        select: {
          id: true,
          subjectPatientId: true,
          status: true,
          expiresAt: true,
          verifiedAt: true,
          verifiedByEmployeeId: true,
          subjectPatient: { select: { id: true, isActive: true, dateOfBirth: true } },
          granteePatient: { select: verifiedPatientSelect },
        },
      });

      if (!grant) {
        throw new AccountLinkError("PATIENT_DELEGATION_NOT_FOUND", "The patient delegation was not found.", 404);
      }
      if (grant.subjectPatientId !== actorPatientId) {
        throw new AccountLinkError("PATIENT_DELEGATION_OWNER_REQUIRED", "Only the subject patient can decide this request.", 403);
      }
      if (grant.status !== "PENDING") {
        throw new AccountLinkError("PATIENT_DELEGATION_NOT_PENDING", "This delegation is not awaiting patient approval.", 409);
      }
      if (!grant.expiresAt || grant.expiresAt.getTime() <= now.getTime()) {
        throw new AccountLinkError("PATIENT_DELEGATION_EXPIRED", "This delegation request has no valid future expiry. Ask the clinic to issue a new request.", 410);
      }
      const age = calculatePatientAge(grant.subjectPatient.dateOfBirth, now);
      if (age === null || age < 18 || !grant.subjectPatient.isActive) {
        throw new AccountLinkError("ADULT_SUBJECT_APPROVAL_REQUIRED", "Only an active adult subject patient can approve this delegation request.", 403);
      }
      if (!grant.granteePatient.isActive || !hasVerifiedPatientAccount(grant.granteePatient)) {
        throw new AccountLinkError("DELEGATE_PATIENT_ACCOUNT_REQUIRED", "The delegate must have an active, verified patient sign-in account.", 409);
      }
      if (!grant.verifiedAt || !grant.verifiedByEmployeeId) {
        throw new AccountLinkError("STAFF_VERIFICATION_REQUIRED", "The clinic must verify this request before the patient can decide it.", 409);
      }

      const nextStatus = input.decision === "APPROVE" ? "ACTIVE" : "REJECTED";
      await transaction.patientAccessGrant.update({
        where: { id: grant.id },
        data: {
          status: nextStatus,
          approvedByPatientId: input.decision === "APPROVE" ? actorPatientId : null,
          approvedAt: input.decision === "APPROVE" ? now : null,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorType: "EXTERNAL",
          actorEmployeeId: null,
          action: input.decision === "APPROVE" ? "PATIENT_ACCESS_GRANT_APPROVED" : "PATIENT_ACCESS_GRANT_REJECTED",
          entityType: "PatientAccessGrant",
          entityId: grant.id,
          reason: `subjectPatientId=${actorPatientId}; ${input.reason?.trim() || (input.decision === "APPROVE"
            ? "Subject patient approved the delegation request."
            : "Subject patient rejected the delegation request.")}`.slice(0, 500),
          occurredAt: now,
        },
      });

      return { grantId: grant.id, status: nextStatus };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    translateDatabaseConflict(error);
  }
}
