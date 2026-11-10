export type DoctorReferralLifecycleAction = "ACCEPT" | "COMPLETE" | "CANCEL";

export interface DoctorReferralInboxVisibilityInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  activeSpecialtyIds: readonly string[];
  referralType: string;
  referralStatus: string;
  referredToDoctorId: string | null;
  referredToSpecialtyId: string | null;
}

export function isDoctorReferralInboxVisible(input: DoctorReferralInboxVisibilityInput): boolean {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR") || !input.doctorProfileId) {
    return false;
  }
  if (input.referralType !== "INTERNAL" || !["PENDING", "ACCEPTED"].includes(input.referralStatus)) {
    return false;
  }

  if (input.referredToDoctorId !== null) {
    if (input.referredToDoctorId !== input.doctorProfileId) return false;
    return input.referredToSpecialtyId === null
      || input.activeSpecialtyIds.includes(input.referredToSpecialtyId);
  }

  return input.referredToSpecialtyId !== null
    && input.activeSpecialtyIds.includes(input.referredToSpecialtyId);
}

export interface DoctorReferralLifecycleDecisionInput {
  employeeId: string;
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  activeSpecialtyIds: readonly string[];
  referralExists: boolean;
  referralType: string | null;
  referralStatus: string | null;
  createdByEmployeeId: string | null;
  referredToDoctorId: string | null;
  referredToSpecialtyId: string | null;
  action: DoctorReferralLifecycleAction;
}

export type DoctorReferralLifecycleRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "REFERRAL_NOT_FOUND"
  | "REFERRAL_ACTION_NOT_SUPPORTED"
  | "REFERRAL_NOT_ASSIGNED_TO_DOCTOR"
  | "REFERRAL_NOT_CREATED_BY_DOCTOR"
  | "REFERRAL_STATUS_TRANSITION_INVALID";

export type DoctorReferralLifecycleDecision =
  | { kind: "ALLOW"; previousStatus: "PENDING" | "ACCEPTED"; nextStatus: "ACCEPTED" | "COMPLETED" | "CANCELLED" }
  | { kind: "REJECT"; code: DoctorReferralLifecycleRejection };

export function decideDoctorReferralLifecycleTransition(
  input: DoctorReferralLifecycleDecisionInput,
): DoctorReferralLifecycleDecision {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR")) {
    return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  }
  if (!input.doctorProfileId) return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  if (!input.referralExists || !input.referralType || !input.referralStatus || !input.createdByEmployeeId) {
    return { kind: "REJECT", code: "REFERRAL_NOT_FOUND" };
  }

  if (input.action === "CANCEL") {
    if (input.createdByEmployeeId !== input.employeeId) {
      return { kind: "REJECT", code: "REFERRAL_NOT_CREATED_BY_DOCTOR" };
    }
    if (input.referralStatus !== "PENDING" && input.referralStatus !== "ACCEPTED") {
      return { kind: "REJECT", code: "REFERRAL_STATUS_TRANSITION_INVALID" };
    }
    return {
      kind: "ALLOW",
      previousStatus: input.referralStatus,
      nextStatus: "CANCELLED",
    };
  }

  if (input.referralType !== "INTERNAL") {
    return { kind: "REJECT", code: "REFERRAL_ACTION_NOT_SUPPORTED" };
  }

  const directlyAssigned = input.referredToDoctorId !== null
    && input.referredToDoctorId === input.doctorProfileId
    && (
      input.referredToSpecialtyId === null
      || input.activeSpecialtyIds.includes(input.referredToSpecialtyId)
    );
  const assignedThroughSpecialty = input.referredToDoctorId === null
    && input.referredToSpecialtyId !== null
    && input.activeSpecialtyIds.includes(input.referredToSpecialtyId);

  if (!directlyAssigned && !assignedThroughSpecialty) {
    return { kind: "REJECT", code: "REFERRAL_NOT_ASSIGNED_TO_DOCTOR" };
  }

  if (input.action === "ACCEPT" && input.referralStatus === "PENDING") {
    return { kind: "ALLOW", previousStatus: "PENDING", nextStatus: "ACCEPTED" };
  }
  if (input.action === "COMPLETE" && input.referralStatus === "ACCEPTED") {
    return { kind: "ALLOW", previousStatus: "ACCEPTED", nextStatus: "COMPLETED" };
  }
  return { kind: "REJECT", code: "REFERRAL_STATUS_TRANSITION_INVALID" };
}
