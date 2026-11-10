import { describe, expect, it } from "vitest";
import {
  doctorLabCatalogQuerySchema,
  doctorLabEncounterIdSchema,
  doctorLabOrderRequestSchema,
} from "../../src/server/appointments/doctor-lab-order-validation";

const validOrder = { labTestIds: ["test_1"] };

describe("Doctor lab order request validation", () => {
  it("accepts a valid Encounter ID", () => {
    expect(doctorLabEncounterIdSchema.safeParse("encounter_1").success).toBe(true);
  });
  it("trims the Encounter ID", () => {
    expect(doctorLabEncounterIdSchema.parse("  encounter_1  ")).toBe("encounter_1");
  });
  it("rejects an empty Encounter ID", () => {
    expect(doctorLabEncounterIdSchema.safeParse("   ").success).toBe(false);
  });
  it("accepts an omitted catalog query", () => {
    expect(doctorLabCatalogQuerySchema.safeParse(undefined).success).toBe(true);
  });
  it("trims a catalog query", () => {
    expect(doctorLabCatalogQuerySchema.parse("  CBC  ")).toBe("CBC");
  });
  it("rejects a catalog query longer than eighty characters", () => {
    expect(doctorLabCatalogQuerySchema.safeParse("a".repeat(81)).success).toBe(false);
  });
  it("accepts one selected lab test", () => {
    expect(doctorLabOrderRequestSchema.safeParse(validOrder).success).toBe(true);
  });
  it("accepts twenty selected lab tests", () => {
    const labTestIds = Array.from({ length: 20 }, (_, index) => `test_${index}`);
    expect(doctorLabOrderRequestSchema.safeParse({ labTestIds }).success).toBe(true);
  });
  it("rejects an empty test list", () => {
    expect(doctorLabOrderRequestSchema.safeParse({ labTestIds: [] }).success).toBe(false);
  });
  it("rejects more than twenty tests", () => {
    const labTestIds = Array.from({ length: 21 }, (_, index) => `test_${index}`);
    expect(doctorLabOrderRequestSchema.safeParse({ labTestIds }).success).toBe(false);
  });
  it("rejects repeated test IDs", () => {
    expect(doctorLabOrderRequestSchema.safeParse({ labTestIds: ["test_1", "test_1"] }).success).toBe(false);
  });
  it("defaults priority to ROUTINE", () => {
    expect(doctorLabOrderRequestSchema.parse(validOrder).priority).toBe("ROUTINE");
  });
  it("accepts URGENT priority", () => {
    expect(doctorLabOrderRequestSchema.safeParse({ ...validOrder, priority: "URGENT" }).success).toBe(true);
  });
  it("rejects unsupported priorities", () => {
    expect(doctorLabOrderRequestSchema.safeParse({ ...validOrder, priority: "CRITICAL" }).success).toBe(false);
  });
  it("trims optional clinical notes", () => {
    expect(doctorLabOrderRequestSchema.parse({ ...validOrder, clinicalNotes: "  Follow-up  " }).clinicalNotes).toBe("Follow-up");
  });
  it("bounds clinical notes to one thousand characters", () => {
    expect(doctorLabOrderRequestSchema.safeParse({ ...validOrder, clinicalNotes: "a".repeat(1_001) }).success).toBe(false);
  });
  it("rejects caller-controlled patient, doctor, order, author, status, price, and test-label fields", () => {
    expect(doctorLabOrderRequestSchema.safeParse({
      ...validOrder,
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      orderReference: "LAB-FORGED",
      orderedByEmployeeId: "employee_forged",
      status: "COMPLETED",
      price: "0.01",
      tests: [{ name: "Free text test" }],
    }).success).toBe(false);
  });
});
