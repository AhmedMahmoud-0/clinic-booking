import { describe, expect, it } from "vitest";
import {
  doctorRadiologyCatalogQuerySchema,
  doctorRadiologyEncounterIdSchema,
  doctorRadiologyOrderRequestSchema,
} from "../../src/server/appointments/doctor-radiology-order-validation";

const validXrayOrder = {
  procedureIds: ["procedure_xray_1"],
  priority: "ROUTINE",
  xrayPregnancyAssessment: { assessment: "SCREENING_REQUIRED" },
};

describe("Doctor radiology request validation", () => {
  it("accepts and trims a valid Encounter ID", () => {
    expect(doctorRadiologyEncounterIdSchema.parse(" encounter_1 ")).toBe("encounter_1");
  });
  it("rejects an empty Encounter ID", () => {
    expect(doctorRadiologyEncounterIdSchema.safeParse("  ").success).toBe(false);
  });
  it("accepts an omitted catalogue query", () => {
    expect(doctorRadiologyCatalogQuerySchema.parse(undefined)).toBeUndefined();
  });
  it("trims a bounded catalogue query", () => {
    expect(doctorRadiologyCatalogQuerySchema.parse(" chest ")).toBe("chest");
  });
  it("rejects catalogue queries longer than eighty characters", () => {
    expect(doctorRadiologyCatalogQuerySchema.safeParse("x".repeat(81)).success).toBe(false);
  });
  it("accepts the minimum valid procedure selection and defaults routine priority", () => {
    const parsed = doctorRadiologyOrderRequestSchema.parse({ procedureIds: ["procedure_1"] });
    expect(parsed.priority).toBe("ROUTINE");
  });
  it("accepts up to ten procedure IDs", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({ procedureIds: Array.from({ length: 10 }, (_, i) => `proc_${i}`) }).success).toBe(true);
  });
  it("rejects an empty procedure selection", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({ procedureIds: [] }).success).toBe(false);
  });
  it("rejects more than ten procedure IDs", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({ procedureIds: Array.from({ length: 11 }, (_, i) => `proc_${i}`) }).success).toBe(false);
  });
  it("rejects duplicate procedure IDs", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({ procedureIds: ["procedure_1", "procedure_1"] }).success).toBe(false);
  });
  it("accepts routine and urgent priority only", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({ ...validXrayOrder, priority: "URGENT" }).success).toBe(true);
    expect(doctorRadiologyOrderRequestSchema.safeParse({ ...validXrayOrder, priority: "STAT" }).success).toBe(false);
  });
  it("accepts bounded optional clinical notes", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({ ...validXrayOrder, clinicalNotes: "Evaluate chest symptoms." }).success).toBe(true);
    expect(doctorRadiologyOrderRequestSchema.safeParse({ ...validXrayOrder, clinicalNotes: "x".repeat(1_001) }).success).toBe(false);
  });
  it("accepts a pre-order decision that formal screening is required for an X-ray", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse(validXrayOrder).success).toBe(true);
  });
  it("accepts a decision that screening is not indicated only with a clinical rationale", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({
      ...validXrayOrder,
      xrayPregnancyAssessment: { assessment: "NOT_INDICATED", notes: "Clinical rationale: screening not indicated." },
    }).success).toBe(true);
  });
  it("rejects not-indicated decisions without a clinical rationale", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({
      ...validXrayOrder,
      xrayPregnancyAssessment: { assessment: "NOT_INDICATED" },
    }).success).toBe(false);
  });
  it("does not accept clinical screening result values as order-time assessment decisions", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({
      ...validXrayOrder,
      xrayPregnancyAssessment: { assessment: "NEGATIVE" },
    }).success).toBe(false);
    expect(doctorRadiologyOrderRequestSchema.safeParse({
      ...validXrayOrder,
      xrayPregnancyAssessment: { assessment: "POSITIVE" },
    }).success).toBe(false);
  });
  it("rejects client-controlled patient, Doctor, author, status, resource, price, and timestamp fields", () => {
    expect(doctorRadiologyOrderRequestSchema.safeParse({
      ...validXrayOrder,
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      orderedByEmployeeId: "employee_forged",
      orderReference: "RAD-FORGED",
      status: "COMPLETED",
      resourceId: "resource_forged",
      priceSnapshot: "0.01",
      orderedAt: "2026-01-01T00:00:00.000Z",
    }).success).toBe(false);
  });
});
