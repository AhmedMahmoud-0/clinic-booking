import { describe, expect, it } from "vitest";
import { doctorClinicalNoteDraftRequestSchema } from "../../src/server/appointments/doctor-clinical-note-validation";

const minimalRequest = { chiefComplaint: "Chest discomfort for two days" };

describe("Doctor clinical-note draft validation", () => {
  it("accepts the required chief complaint without optional sections", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse(minimalRequest).success).toBe(true);
  });

  it("accepts all supported narrative fields", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({
      chiefComplaint: "Chest discomfort",
      historyOfPresentIllness: "Symptoms worsen with exertion.",
      clinicalExamination: "Heart sounds regular.",
      assessment: "Clinical assessment text.",
      treatmentPlan: "Review in one week.",
    }).success).toBe(true);
  });

  it("trims surrounding whitespace from narrative fields", () => {
    expect(doctorClinicalNoteDraftRequestSchema.parse({
      chiefComplaint: "  Headache  ",
      historyOfPresentIllness: "  Started yesterday  ",
    })).toEqual({
      chiefComplaint: "Headache",
      historyOfPresentIllness: "Started yesterday",
    });
  });

  it("rejects a missing chief complaint", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an empty or whitespace-only chief complaint", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({ chiefComplaint: "   " }).success).toBe(false);
  });

  it("rejects a chief complaint longer than 2,000 characters", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({ chiefComplaint: "x".repeat(2_001) }).success).toBe(false);
  });

  it("rejects a clinical narrative field longer than 10,000 characters", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({
      ...minimalRequest,
      historyOfPresentIllness: "x".repeat(10_001),
    }).success).toBe(false);
  });

  it("accepts explicit null for optional clinical sections", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({
      ...minimalRequest,
      historyOfPresentIllness: null,
      clinicalExamination: null,
      assessment: null,
      treatmentPlan: null,
    }).success).toBe(true);
  });

  it("rejects caller-supplied identity, author, note status, or diagnosis fields", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({
      ...minimalRequest,
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      authorEmployeeId: "employee_forged",
      status: "SIGNED",
      diagnosisId: "diagnosis_forged",
    }).success).toBe(false);
  });

  it("rejects non-string clinical content", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({
      ...minimalRequest,
      treatmentPlan: 123,
    }).success).toBe(false);
  });

  it("rejects an object instead of clinical text", () => {
    expect(doctorClinicalNoteDraftRequestSchema.safeParse({
      ...minimalRequest,
      assessment: {},
    }).success).toBe(false);
  });
});
