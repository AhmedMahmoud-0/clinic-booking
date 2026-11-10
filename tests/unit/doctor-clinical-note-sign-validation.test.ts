import { describe, expect, it } from "vitest";
import { doctorClinicalNoteSignRequestSchema } from "../../src/server/appointments/doctor-clinical-note-sign-validation";

describe("Doctor clinical-note sign request validation", () => {
  it("accepts only an empty object", () => {
    expect(doctorClinicalNoteSignRequestSchema.safeParse({}).success).toBe(true);
  });

  it("rejects caller-selected signature status", () => {
    expect(doctorClinicalNoteSignRequestSchema.safeParse({ status: "SIGNED" }).success).toBe(false);
  });

  it("rejects caller-selected signature time", () => {
    expect(doctorClinicalNoteSignRequestSchema.safeParse({ signedAt: "2026-11-10T00:00:00.000Z" }).success).toBe(false);
  });

  it("rejects caller-selected author or signer", () => {
    expect(doctorClinicalNoteSignRequestSchema.safeParse({ authorEmployeeId: "employee_1", signedByEmployeeId: "employee_1" }).success).toBe(false);
  });

  it("rejects clinical content sent during signing", () => {
    expect(doctorClinicalNoteSignRequestSchema.safeParse({ assessment: "forged" }).success).toBe(false);
  });

  it("rejects null, arrays, and primitive values", () => {
    expect(doctorClinicalNoteSignRequestSchema.safeParse(null).success).toBe(false);
    expect(doctorClinicalNoteSignRequestSchema.safeParse([]).success).toBe(false);
    expect(doctorClinicalNoteSignRequestSchema.safeParse("SIGNED").success).toBe(false);
  });
});
