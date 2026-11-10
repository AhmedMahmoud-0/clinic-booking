import { describe, expect, it } from "vitest";
import {
  doctorReferralEncounterIdSchema,
  doctorReferralRequestSchema,
} from "../../src/server/appointments/doctor-referral-validation";

const internalReferral = {
  type: "INTERNAL",
  referredToSpecialtyId: "specialty_1",
  reason: "Requires specialist review",
};

const externalReferral = {
  type: "EXTERNAL",
  externalFacilityName: "External Imaging Center",
  reason: "Requires a service not available at this clinic",
};

describe("Doctor referral request validation", () => {
  it("accepts and trims an Encounter ID", () => {
    expect(doctorReferralEncounterIdSchema.parse("  encounter_1  ")).toBe("encounter_1");
  });
  it("rejects an empty Encounter ID", () => {
    expect(doctorReferralEncounterIdSchema.safeParse("   ").success).toBe(false);
  });
  it("accepts an internal referral to a specialty", () => {
    expect(doctorReferralRequestSchema.safeParse(internalReferral).success).toBe(true);
  });
  it("accepts an internal referral to a Doctor only", () => {
    expect(doctorReferralRequestSchema.safeParse({
      type: "INTERNAL",
      referredToDoctorId: "doctor_1",
      reason: "Requires specialist review",
    }).success).toBe(true);
  });
  it("accepts an internal referral to both a Doctor and specialty", () => {
    expect(doctorReferralRequestSchema.safeParse({
      type: "INTERNAL",
      referredToSpecialtyId: "specialty_1",
      referredToDoctorId: "doctor_1",
      reason: "Requires specialist review",
    }).success).toBe(true);
  });
  it("rejects an internal referral without a target", () => {
    expect(doctorReferralRequestSchema.safeParse({
      type: "INTERNAL",
      reason: "Requires specialist review",
    }).success).toBe(false);
  });
  it("rejects external facility data on an internal referral", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...internalReferral,
      externalFacilityName: "External Center",
    }).success).toBe(false);
  });
  it("accepts an external referral with an optional contact", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...externalReferral,
      externalContact: "02-12345678",
    }).success).toBe(true);
  });
  it("rejects an external referral without a facility name", () => {
    expect(doctorReferralRequestSchema.safeParse({
      type: "EXTERNAL",
      reason: "Requires external service",
    }).success).toBe(false);
  });
  it("rejects internal targets on an external referral", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...externalReferral,
      referredToSpecialtyId: "specialty_1",
    }).success).toBe(false);
  });
  it("rejects a blank reason", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...internalReferral,
      reason: "   ",
    }).success).toBe(false);
  });
  it("bounds the reason to one thousand characters", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...internalReferral,
      reason: "x".repeat(1_001),
    }).success).toBe(false);
  });
  it("trims bounded instructions", () => {
    expect(doctorReferralRequestSchema.parse({
      ...internalReferral,
      instructions: "  Bring prior reports  ",
    }).instructions).toBe("Bring prior reports");
  });
  it("bounds facility and contact fields to 180 characters", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...externalReferral,
      externalFacilityName: "x".repeat(181),
    }).success).toBe(false);
    expect(doctorReferralRequestSchema.safeParse({
      ...externalReferral,
      externalContact: "x".repeat(181),
    }).success).toBe(false);
  });
  it("rejects caller-controlled Encounter, patient, author, status, and timestamp fields", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...internalReferral,
      encounterId: "encounter_forged",
      patientId: "patient_forged",
      createdByEmployeeId: "employee_forged",
      status: "COMPLETED",
      completedAt: "2026-01-01T00:00:00.000Z",
    }).success).toBe(false);
  });
  it("rejects an unknown referral type", () => {
    expect(doctorReferralRequestSchema.safeParse({
      ...internalReferral,
      type: "TRANSFER",
    }).success).toBe(false);
  });
});
