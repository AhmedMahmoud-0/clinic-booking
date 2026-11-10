export interface DoctorReferralEncounterAccessInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterCompletedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
}

export type DoctorReferralPolicyRejection =
  | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
  | "DOCTOR_PROFILE_REQUIRED"
  | "ENCOUNTER_NOT_FOUND"
  | "ENCOUNTER_NOT_EDITABLE"
  | "ENCOUNTER_SOURCE_INCONSISTENT"
  | "REFERRAL_TARGET_INVALID"
  | "REFERRAL_SPECIALTY_NOT_AVAILABLE"
  | "REFERRAL_DOCTOR_NOT_AVAILABLE"
  | "REFERRAL_DOCTOR_SPECIALTY_MISMATCH";

export type DoctorReferralEncounterDecision =
  | { kind: "ALLOW"; doctorProfileId: string }
  | { kind: "REJECT"; code: DoctorReferralPolicyRejection };

export function decideDoctorReferralEncounterAccess(
  input: DoctorReferralEncounterAccessInput,
): DoctorReferralEncounterDecision {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR")) {
    return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  }
  if (!input.doctorProfileId) return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  if (!input.encounterExists || input.encounterDoctorId !== input.doctorProfileId) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  }
  if (input.encounterStatus !== "IN_PROGRESS" || input.encounterCompletedAtExists) {
    return { kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" };
  }
  if (!input.encounterOriginIsConsistent) {
    return { kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" };
  }
  return { kind: "ALLOW", doctorProfileId: input.doctorProfileId };
}

export interface DoctorReferralTargetInput {
  type: string;
  referredToSpecialtyId: string | null;
  referredToDoctorId: string | null;
  externalFacilityName: string | null;
  externalContact: string | null;
  availableSpecialtyIds: readonly string[];
  availableDoctors: readonly { id: string; specialtyIds: readonly string[] }[];
}

export type DoctorReferralTargetDecision =
  | { kind: "ALLOW" }
  | {
      kind: "REJECT";
      code:
        | "REFERRAL_TARGET_INVALID"
        | "REFERRAL_SPECIALTY_NOT_AVAILABLE"
        | "REFERRAL_DOCTOR_NOT_AVAILABLE"
        | "REFERRAL_DOCTOR_SPECIALTY_MISMATCH";
    };

export function decideDoctorReferralTarget(
  input: DoctorReferralTargetInput,
): DoctorReferralTargetDecision {
  if (input.type === "INTERNAL") {
    if (
      input.externalFacilityName !== null
      || input.externalContact !== null
      || (!input.referredToSpecialtyId && !input.referredToDoctorId)
    ) {
      return { kind: "REJECT", code: "REFERRAL_TARGET_INVALID" };
    }
    if (
      input.referredToSpecialtyId
      && !input.availableSpecialtyIds.includes(input.referredToSpecialtyId)
    ) {
      return { kind: "REJECT", code: "REFERRAL_SPECIALTY_NOT_AVAILABLE" };
    }
    if (input.referredToDoctorId) {
      const doctor = input.availableDoctors.find((candidate) => candidate.id === input.referredToDoctorId);
      if (!doctor) return { kind: "REJECT", code: "REFERRAL_DOCTOR_NOT_AVAILABLE" };
      if (
        input.referredToSpecialtyId
        && !doctor.specialtyIds.includes(input.referredToSpecialtyId)
      ) {
        return { kind: "REJECT", code: "REFERRAL_DOCTOR_SPECIALTY_MISMATCH" };
      }
    }
    return { kind: "ALLOW" };
  }

  if (input.type === "EXTERNAL") {
    if (
      !input.externalFacilityName?.trim()
      || input.referredToSpecialtyId !== null
      || input.referredToDoctorId !== null
    ) {
      return { kind: "REJECT", code: "REFERRAL_TARGET_INVALID" };
    }
    return { kind: "ALLOW" };
  }

  return { kind: "REJECT", code: "REFERRAL_TARGET_INVALID" };
}
