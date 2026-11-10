import "server-only";

import { getPrismaClient } from "../../db/client";
import { AuthorizationError } from "./errors";
import { isPatientDelegationAllowed } from "./delegation-policy";
import { requirePatientActor } from "./actor";
import type {
  PatientAccessScope,
  PatientRecordAccessContext,
} from "./types";

/**
 * Authorize access to one patient profile for one exact delegated scope.
 * The patient's own verified account can access its own profile. A related
 * profile requires an active, unexpired, staff-verified grant and the explicit
 * scope requested by the caller.
 *
 * This check does not replace encounter assignment, record-state, or workflow
 * authorization. Those checks remain mandatory in each domain data service.
 */
export async function requirePatientRecordAccess(
  subjectPatientId: string,
  requiredScope: PatientAccessScope,
): Promise<PatientRecordAccessContext> {
  if (!subjectPatientId.trim()) {
    throw new AuthorizationError(
      "PATIENT_ACCESS_DENIED",
      "Access to this patient record is not permitted.",
      403,
    );
  }

  const actor = await requirePatientActor();

  if (actor.patientId === subjectPatientId) {
    return {
      patientId: subjectPatientId,
      granteePatientId: actor.patientId,
      scope: requiredScope,
      accessType: "SELF",
      grantId: null,
    };
  }

  const prisma = getPrismaClient();
  const now = new Date();
  const grant = await prisma.patientAccessGrant.findUnique({
    where: {
      subjectPatientId_granteePatientId: {
        subjectPatientId,
        granteePatientId: actor.patientId,
      },
    },
    select: {
      id: true,
      status: true,
      verifiedAt: true,
      verifiedByEmployeeId: true,
      expiresAt: true,
      revokedAt: true,
      approvedByPatientId: true,
      approvedAt: true,
      subjectPatient: {
        select: {
          id: true,
          isActive: true,
          dateOfBirth: true,
        },
      },
      relationship: {
        select: {
          isActive: true,
          isLegalGuardian: true,
          guardianVerifiedAt: true,
          guardianVerifiedByEmployeeId: true,
        },
      },
      permissions: {
        select: { scope: true },
      },
    },
  });

  const allowed =
    grant !== null &&
    grant.subjectPatient.isActive &&
    isPatientDelegationAllowed({
      subjectPatientId: grant.subjectPatient.id,
      requiredScope,
      grantedScopes: grant.permissions.map((permission: { scope: string }) => permission.scope),
      grantStatus: grant.status,
      grantVerifiedAt: grant.verifiedAt,
      grantVerifiedByEmployeeId: grant.verifiedByEmployeeId,
      grantExpiresAt: grant.expiresAt,
      grantRevokedAt: grant.revokedAt,
      approvedByPatientId: grant.approvedByPatientId,
      approvedAt: grant.approvedAt,
      subjectDateOfBirth: grant.subjectPatient.dateOfBirth,
      relationshipIsActive: grant.relationship.isActive,
      relationshipIsLegalGuardian: grant.relationship.isLegalGuardian,
      relationshipGuardianVerifiedAt: grant.relationship.guardianVerifiedAt,
      relationshipGuardianVerifiedByEmployeeId:
        grant.relationship.guardianVerifiedByEmployeeId,
      now,
    });

  if (!allowed || !grant) {
    // Do not disclose whether the target patient or relationship exists.
    throw new AuthorizationError(
      "PATIENT_ACCESS_DENIED",
      "Access to this patient record is not permitted.",
      403,
    );
  }

  return {
    patientId: subjectPatientId,
    granteePatientId: actor.patientId,
    scope: requiredScope,
    accessType: "DELEGATED",
    grantId: grant.id,
  };
}
