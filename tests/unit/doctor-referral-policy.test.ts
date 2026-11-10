import { describe, expect, it } from "vitest";
import {
  decideDoctorReferralEncounterAccess,
  decideDoctorReferralTarget,
} from "../../src/server/appointments/doctor-referral-policy";

const validEncounter = {
  employeeStatus: "ACTIVE",
  activeRoles: ["DOCTOR"],
  doctorProfileId: "doctor_1",
  encounterExists: true,
  encounterDoctorId: "doctor_1",
  encounterStatus: "IN_PROGRESS",
  encounterCompletedAtExists: false,
  encounterOriginIsConsistent: true,
};

const activeTargets = {
  availableSpecialtyIds: ["specialty_1", "specialty_2"],
  availableDoctors: [
    { id: "doctor_2", specialtyIds: ["specialty_1"] },
    { id: "doctor_3", specialtyIds: ["specialty_2"] },
  ],
};

describe("Doctor referral Encounter access policy", () => {
  it("allows an active Doctor assigned to an in-progress Encounter", () => {
    expect(decideDoctorReferralEncounterAccess(validEncounter)).toEqual({
      kind: "ALLOW",
      doctorProfileId: "doctor_1",
    });
  });
  it("rejects inactive employees", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, employeeStatus: "INACTIVE" })).toEqual({
      kind: "REJECT",
      code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });
  it("rejects employees without an active Doctor role", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, activeRoles: ["RECEPTION"] })).toEqual({
      kind: "REJECT",
      code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED",
    });
  });
  it("rejects a missing Doctor profile", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, doctorProfileId: null })).toEqual({
      kind: "REJECT",
      code: "DOCTOR_PROFILE_REQUIRED",
    });
  });
  it("conceals an Encounter assigned to another Doctor", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, encounterDoctorId: "doctor_2" })).toEqual({
      kind: "REJECT",
      code: "ENCOUNTER_NOT_FOUND",
    });
  });
  it("rejects a missing Encounter", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, encounterExists: false })).toEqual({
      kind: "REJECT",
      code: "ENCOUNTER_NOT_FOUND",
    });
  });
  it("rejects a completed Encounter", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, encounterStatus: "COMPLETED" })).toEqual({
      kind: "REJECT",
      code: "ENCOUNTER_NOT_EDITABLE",
    });
  });
  it("rejects an Encounter with a completion timestamp", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, encounterCompletedAtExists: true })).toEqual({
      kind: "REJECT",
      code: "ENCOUNTER_NOT_EDITABLE",
    });
  });
  it("rejects an inconsistent visit origin", () => {
    expect(decideDoctorReferralEncounterAccess({ ...validEncounter, encounterOriginIsConsistent: false })).toEqual({
      kind: "REJECT",
      code: "ENCOUNTER_SOURCE_INCONSISTENT",
    });
  });
});

describe("Doctor referral target policy", () => {
  it("allows an internal specialty referral", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: "specialty_1",
      referredToDoctorId: null,
      externalFacilityName: null,
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "ALLOW" });
  });
  it("allows an internal Doctor-only referral to an active Doctor", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: null,
      referredToDoctorId: "doctor_2",
      externalFacilityName: null,
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "ALLOW" });
  });
  it("allows a Doctor and matching specialty target", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: "specialty_1",
      referredToDoctorId: "doctor_2",
      externalFacilityName: null,
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "ALLOW" });
  });
  it("rejects an internal referral without a target", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: null,
      referredToDoctorId: null,
      externalFacilityName: null,
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "REJECT", code: "REFERRAL_TARGET_INVALID" });
  });
  it("rejects an inactive or unknown specialty", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: "specialty_unknown",
      referredToDoctorId: null,
      externalFacilityName: null,
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "REJECT", code: "REFERRAL_SPECIALTY_NOT_AVAILABLE" });
  });
  it("rejects an inactive or unknown Doctor", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: null,
      referredToDoctorId: "doctor_unknown",
      externalFacilityName: null,
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "REJECT", code: "REFERRAL_DOCTOR_NOT_AVAILABLE" });
  });
  it("rejects a Doctor who is not assigned to the selected specialty", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: "specialty_1",
      referredToDoctorId: "doctor_3",
      externalFacilityName: null,
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "REJECT", code: "REFERRAL_DOCTOR_SPECIALTY_MISMATCH" });
  });
  it("rejects external facility fields on an internal referral", () => {
    expect(decideDoctorReferralTarget({
      type: "INTERNAL",
      referredToSpecialtyId: "specialty_1",
      referredToDoctorId: null,
      externalFacilityName: "External Center",
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "REJECT", code: "REFERRAL_TARGET_INVALID" });
  });
  it("allows an external referral with a facility and optional contact", () => {
    expect(decideDoctorReferralTarget({
      type: "EXTERNAL",
      referredToSpecialtyId: null,
      referredToDoctorId: null,
      externalFacilityName: "External Center",
      externalContact: "02-12345678",
      ...activeTargets,
    })).toEqual({ kind: "ALLOW" });
  });
  it("rejects an external referral without a facility name", () => {
    expect(decideDoctorReferralTarget({
      type: "EXTERNAL",
      referredToSpecialtyId: null,
      referredToDoctorId: null,
      externalFacilityName: "   ",
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "REJECT", code: "REFERRAL_TARGET_INVALID" });
  });
  it("rejects internal targets on an external referral", () => {
    expect(decideDoctorReferralTarget({
      type: "EXTERNAL",
      referredToSpecialtyId: "specialty_1",
      referredToDoctorId: null,
      externalFacilityName: "External Center",
      externalContact: null,
      ...activeTargets,
    })).toEqual({ kind: "REJECT", code: "REFERRAL_TARGET_INVALID" });
  });
});
