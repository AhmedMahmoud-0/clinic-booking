import { describe, expect, it } from "vitest";
import {
  doctorDiagnosisAddRequestSchema,
  doctorDiagnosisCatalogQuerySchema,
  doctorDiagnosisEncounterIdSchema,
  doctorDiagnosisPrimaryRequestSchema,
} from "../../src/server/appointments/doctor-diagnosis-validation";

describe("Doctor diagnosis route validation", () => {
  it("accepts a valid Encounter ID", () => {
    expect(doctorDiagnosisEncounterIdSchema.safeParse("encounter_demo_1").success).toBe(true);
  });

  it("trims and bounds catalogue search terms", () => {
    expect(doctorDiagnosisCatalogQuerySchema.parse("  hypertension  ")).toBe("hypertension");
    expect(doctorDiagnosisCatalogQuerySchema.safeParse("x".repeat(81)).success).toBe(false);
  });

  it("defaults a new diagnosis to non-primary when the service has an existing primary", () => {
    expect(doctorDiagnosisAddRequestSchema.parse({ diagnosisId: "diagnosis_1" })).toEqual({
      diagnosisId: "diagnosis_1", isPrimary: false,
    });
  });

  it("trims diagnosis ID and optional notes", () => {
    expect(doctorDiagnosisAddRequestSchema.parse({ diagnosisId: " diagnosis_1 ", notes: "  synthetic note  " })).toEqual({
      diagnosisId: "diagnosis_1", notes: "synthetic note", isPrimary: false,
    });
  });

  it("accepts null notes and an explicit primary flag", () => {
    expect(doctorDiagnosisAddRequestSchema.parse({ diagnosisId: "diagnosis_1", notes: null, isPrimary: true })).toEqual({
      diagnosisId: "diagnosis_1", notes: null, isPrimary: true,
    });
  });

  it("rejects caller-controlled identity, author, and diagnosis text fields", () => {
    expect(doctorDiagnosisAddRequestSchema.safeParse({
      diagnosisId: "diagnosis_1",
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      recordedByEmployeeId: "employee_forged",
      displayName: "Uncatalogued diagnosis",
    }).success).toBe(false);
  });

  it("rejects an empty diagnosis ID", () => {
    expect(doctorDiagnosisAddRequestSchema.safeParse({ diagnosisId: " " }).success).toBe(false);
  });

  it("rejects notes longer than the database field limit", () => {
    expect(doctorDiagnosisAddRequestSchema.safeParse({ diagnosisId: "diagnosis_1", notes: "x".repeat(1_001) }).success).toBe(false);
  });

  it("requires the primary-change action to receive an empty object", () => {
    expect(doctorDiagnosisPrimaryRequestSchema.safeParse({}).success).toBe(true);
    expect(doctorDiagnosisPrimaryRequestSchema.safeParse({ isPrimary: true, actorEmployeeId: "employee_forged" }).success).toBe(false);
  });
});
