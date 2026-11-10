import { describe, expect, it } from "vitest";
import {
  doctorPrescriptionDraftRequestSchema,
  doctorPrescriptionEncounterIdSchema,
  doctorPrescriptionIdSchema,
} from "../../src/server/appointments/doctor-prescription-validation";

const validItem = {
  medicationName: "Paracetamol",
  dosage: "1 tablet",
  frequency: "Every 8 hours",
};
const validRequest = { items: [validItem] };

describe("Doctor prescription request validation", () => {
  it("accepts valid Encounter and Prescription identifiers", () => {
    expect(doctorPrescriptionEncounterIdSchema.safeParse("encounter_1").success).toBe(true);
    expect(doctorPrescriptionIdSchema.safeParse("prescription_1").success).toBe(true);
  });
  it("trims identifier values", () => {
    expect(doctorPrescriptionEncounterIdSchema.parse("  encounter_1  ")).toBe("encounter_1");
    expect(doctorPrescriptionIdSchema.parse("  prescription_1  ")).toBe("prescription_1");
  });
  it("rejects empty identifiers", () => {
    expect(doctorPrescriptionEncounterIdSchema.safeParse(" ").success).toBe(false);
    expect(doctorPrescriptionIdSchema.safeParse(" ").success).toBe(false);
  });
  it("accepts the minimum required medication fields", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse(validRequest).success).toBe(true);
  });
  it("defaults non-PRN and refill fields safely", () => {
    expect(doctorPrescriptionDraftRequestSchema.parse(validRequest).items[0]).toMatchObject({
      isPrn: false,
      refills: 0,
    });
  });
  it("trims medication and instruction text", () => {
    const parsed = doctorPrescriptionDraftRequestSchema.parse({
      generalInstructions: "  Take with food  ",
      items: [{ ...validItem, medicationName: "  Aspirin  ", strength: "  75 mg ", dosage: "  1 tablet ", route: "  Oral  ", frequency: "  Daily  ", instructions: "  After breakfast  " }],
    });
    expect(parsed.generalInstructions).toBe("Take with food");
    expect(parsed.items[0]).toMatchObject({ medicationName: "Aspirin", strength: "75 mg", dosage: "1 tablet", route: "Oral", frequency: "Daily", instructions: "After breakfast" });
  });
  it("accepts optional quantity and duration fields when a quantity unit is present", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      items: [{ ...validItem, durationDays: 5, quantity: "10", quantityUnit: "tablets" }],
    }).success).toBe(true);
  });
  it("requires a quantity unit when a dispense quantity is provided", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      items: [{ ...validItem, quantity: "10" }],
    }).success).toBe(false);
  });
  it("accepts a fully specified PRN maximum dose", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      items: [{ ...validItem, isPrn: true, frequency: "As needed", prnMaxQuantityPerDose: "2", prnMaxDoseUnit: "tablets", prnMaxDosesPerDay: 3 }],
    }).success).toBe(true);
  });
  it("rejects a PRN item without maximum quantity per dose", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      items: [{ ...validItem, isPrn: true, prnMaxDoseUnit: "tablets", prnMaxDosesPerDay: 3 }],
    }).success).toBe(false);
  });
  it("rejects a PRN item without a maximum-dose unit", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      items: [{ ...validItem, isPrn: true, prnMaxQuantityPerDose: "2", prnMaxDosesPerDay: 3 }],
    }).success).toBe(false);
  });
  it("rejects a PRN item without a maximum number of doses per day", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      items: [{ ...validItem, isPrn: true, prnMaxQuantityPerDose: "2", prnMaxDoseUnit: "tablets" }],
    }).success).toBe(false);
  });
  it("rejects PRN maximum-dose fields when isPrn is false", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      items: [{ ...validItem, prnMaxQuantityPerDose: "2", prnMaxDoseUnit: "tablets", prnMaxDosesPerDay: 3 }],
    }).success).toBe(false);
  });
  it("rejects zero and malformed decimal quantities", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, quantity: "0" }] }).success).toBe(false);
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, quantity: "1.234" }] }).success).toBe(false);
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, quantity: "0.5", quantityUnit: "tablets" }] }).success).toBe(true);
  });
  it("rejects empty medication names", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, medicationName: " " }] }).success).toBe(false);
  });
  it("rejects medication names longer than the database limit", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, medicationName: "x".repeat(181) }] }).success).toBe(false);
  });
  it("requires dosage and frequency", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ medicationName: "Drug", frequency: "Daily" }] }).success).toBe(false);
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ medicationName: "Drug", dosage: "1 tablet" }] }).success).toBe(false);
  });
  it("bounds duration, refills, and PRN doses per day", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, durationDays: 0 }] }).success).toBe(false);
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, refills: -1 }] }).success).toBe(false);
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, isPrn: true, prnMaxQuantityPerDose: "1", prnMaxDoseUnit: "tablet", prnMaxDosesPerDay: 25 }] }).success).toBe(true);
  });
  it("requires between one and twenty medication items", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [] }).success).toBe(false);
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: Array.from({ length: 21 }, () => validItem) }).success).toBe(false);
  });
  it("bounds general and per-item instructions", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ generalInstructions: "x".repeat(4_001), items: [validItem] }).success).toBe(false);
    expect(doctorPrescriptionDraftRequestSchema.safeParse({ items: [{ ...validItem, instructions: "x".repeat(1_001) }] }).success).toBe(false);
  });
  it("rejects client-controlled prescription, patient, doctor, author, status, issue, and item IDs", () => {
    expect(doctorPrescriptionDraftRequestSchema.safeParse({
      ...validRequest,
      id: "prescription_forged",
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      prescribedByEmployeeId: "employee_forged",
      status: "ISSUED",
      issuedAt: new Date().toISOString(),
      items: [{ ...validItem, id: "item_forged", sortOrder: 9 }],
    }).success).toBe(false);
  });
});
