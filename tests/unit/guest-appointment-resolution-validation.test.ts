import { describe, expect, it } from "vitest";
import { resolveGuestAppointmentSchema } from "../../src/server/appointments/guest-appointment-resolution-validation";

const validInput = {
  patientId: "patient_demo_123",
  identity: {
    firstIdentifier: { type: "FULL_NAME", value: "Mariam Ali Hassan" },
    secondIdentifier: { type: "DATE_OF_BIRTH", value: "1995-04-12" },
  },
};

describe("guest appointment resolution validation", () => {
  it("accepts an existing patient ID and two distinct supported identifiers", () => {
    expect(resolveGuestAppointmentSchema.safeParse(validInput).success).toBe(true);
  });

  it("requires an existing patient ID", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...validInput,
      patientId: " ",
    }).success).toBe(false);
  });

  it("requires both identity elements", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...validInput,
      identity: { firstIdentifier: validInput.identity.firstIdentifier },
    }).success).toBe(false);
  });

  it("rejects using the same identity element twice", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...validInput,
      identity: {
        firstIdentifier: { type: "PHONE", value: "01012345678" },
        secondIdentifier: { type: "PHONE", value: "01012345678" },
      },
    }).success).toBe(false);
  });

  it("rejects identity fields that are not stored on the current Patient model", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...validInput,
      identity: {
        firstIdentifier: validInput.identity.firstIdentifier,
        secondIdentifier: { type: "NATIONAL_ID", value: "12345678901234" },
      },
    }).success).toBe(false);
  });

  it("rejects an invalid date of birth", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...validInput,
      identity: {
        firstIdentifier: validInput.identity.firstIdentifier,
        secondIdentifier: { type: "DATE_OF_BIRTH", value: "1995-02-30" },
      },
    }).success).toBe(false);
  });

  it("rejects an invalid phone identifier", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...validInput,
      identity: {
        firstIdentifier: { type: "PHONE", value: "12345" },
        secondIdentifier: { type: "MRN", value: "MRN-2026-ABCDEF" },
      },
    }).success).toBe(false);
  });

  it("rejects client-supplied override, employee, and guest-contact fields", () => {
    expect(resolveGuestAppointmentSchema.safeParse({
      ...validInput,
      allowPatientOverlap: true,
      employeeId: "employee_admin",
      phone: "01012345678",
    }).success).toBe(false);
  });
});
