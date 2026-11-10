import type { PatientAccessScope } from "./types";

export interface PatientDelegationPolicyInput {
  subjectPatientId: string;
  requiredScope: PatientAccessScope;
  grantedScopes: readonly string[];
  grantStatus: string;
  grantVerifiedAt: Date | null;
  grantVerifiedByEmployeeId: string | null;
  grantExpiresAt: Date | null;
  grantRevokedAt: Date | null;
  approvedByPatientId: string | null;
  approvedAt: Date | null;
  subjectDateOfBirth: Date | null;
  relationshipIsActive: boolean;
  relationshipIsLegalGuardian: boolean;
  relationshipGuardianVerifiedAt: Date | null;
  relationshipGuardianVerifiedByEmployeeId: string | null;
  now: Date;
}

export function calculatePatientAge(dateOfBirth: Date | null, now: Date): number | null {
  if (!dateOfBirth) return null;
  if (
    Number.isNaN(dateOfBirth.getTime()) ||
    Number.isNaN(now.getTime()) ||
    dateOfBirth.getTime() > now.getTime()
  ) {
    return null;
  }

  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const birthdayHasPassed =
    now.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      now.getUTCDate() >= dateOfBirth.getUTCDate());

  if (!birthdayHasPassed) age -= 1;
  return age;
}

/**
 * Evaluates whether a verified relationship grant may be used for one exact
 * patient-data scope. An inactive relationship always fails closed, including
 * adult grants that were previously approved by the subject patient.
 */
export function isPatientDelegationAllowed(
  input: PatientDelegationPolicyInput,
): boolean {
  if (
    !input.relationshipIsActive ||
    input.grantStatus !== "ACTIVE" ||
    input.grantRevokedAt !== null ||
    (input.grantExpiresAt !== null &&
      input.grantExpiresAt.getTime() <= input.now.getTime()) ||
    !input.grantedScopes.includes(input.requiredScope)
  ) {
    return false;
  }

  if (!input.subjectDateOfBirth) return false;

  const age = calculatePatientAge(input.subjectDateOfBirth, input.now);
  if (age === null) return false;

  if (age < 18) {
    return (
      input.grantVerifiedAt !== null &&
      input.grantVerifiedByEmployeeId !== null &&
      input.relationshipIsLegalGuardian &&
      input.relationshipGuardianVerifiedAt !== null &&
      input.relationshipGuardianVerifiedByEmployeeId !== null
    );
  }

  return (
    input.approvedByPatientId === input.subjectPatientId &&
    input.approvedAt !== null
  );
}
