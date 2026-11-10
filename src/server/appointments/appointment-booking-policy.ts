import { isPatientDelegationAllowed } from "../auth/authorization/delegation-policy";

export interface PatientBookingGrant {
  status: string;
  verifiedAt: Date | null;
  verifiedByEmployeeId: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  approvedByPatientId: string | null;
  approvedAt: Date | null;
  scopes: readonly string[];
  relationshipIsActive: boolean;
  relationshipIsLegalGuardian: boolean;
  relationshipGuardianVerifiedAt: Date | null;
  relationshipGuardianVerifiedByEmployeeId: string | null;
}

export interface PatientBookingAuthorityInput {
  actorPatientId: string;
  subjectPatientId: string;
  actorIsActive: boolean;
  subjectIsActive: boolean;
  subjectDateOfBirth: Date | null;
  grant: PatientBookingGrant | null;
  now: Date;
}

/**
 * Booking authority is deliberately separate from medical-record authority.
 * A self-booking needs an active verified portal actor. A different patient
 * record requires the exact BOOK_APPOINTMENTS scope and the same guardian or
 * adult-approval safeguards used by the patient-delegation policy.
 */
export function isPatientBookingAuthorized(input: PatientBookingAuthorityInput): boolean {
  if (!input.actorIsActive || !input.subjectIsActive) return false;

  if (input.actorPatientId === input.subjectPatientId) {
    return true;
  }

  const grant = input.grant;
  if (!grant) return false;

  return isPatientDelegationAllowed({
    subjectPatientId: input.subjectPatientId,
    requiredScope: "BOOK_APPOINTMENTS",
    grantedScopes: grant.scopes,
    grantStatus: grant.status,
    grantVerifiedAt: grant.verifiedAt,
    grantVerifiedByEmployeeId: grant.verifiedByEmployeeId,
    grantExpiresAt: grant.expiresAt,
    grantRevokedAt: grant.revokedAt,
    approvedByPatientId: grant.approvedByPatientId,
    approvedAt: grant.approvedAt,
    subjectDateOfBirth: input.subjectDateOfBirth,
    relationshipIsActive: grant.relationshipIsActive,
    relationshipIsLegalGuardian: grant.relationshipIsLegalGuardian,
    relationshipGuardianVerifiedAt: grant.relationshipGuardianVerifiedAt,
    relationshipGuardianVerifiedByEmployeeId: grant.relationshipGuardianVerifiedByEmployeeId,
    now: input.now,
  });
}

export function isAppointmentSlotSelected(
  slots: readonly { startsAt: string; endsAt: string }[],
  requestedStartsAt: Date,
): { startsAt: Date; endsAt: Date } | null {
  const matchingSlot = slots.find((slot) => {
    const slotStart = new Date(slot.startsAt);
    return Number.isFinite(slotStart.getTime()) && slotStart.getTime() === requestedStartsAt.getTime();
  });

  if (!matchingSlot) return null;
  const startsAt = new Date(matchingSlot.startsAt);
  const endsAt = new Date(matchingSlot.endsAt);
  if (!Number.isFinite(endsAt.getTime()) || endsAt.getTime() <= startsAt.getTime()) return null;
  return { startsAt, endsAt };
}
