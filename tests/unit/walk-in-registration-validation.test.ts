import { describe, expect, it } from "vitest";
import { receptionWalkInRegistrationRequestSchema } from "../../src/server/appointments/walk-in-registration-validation";

const validRequest = {
  patientId: "patient_demo_1",
  doctorId: "doctor_demo_1",
  identity: {
    firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
    secondIdentifier: { type: "DATE_OF_BIRTH", value: "1990-05-14" },
  },
};

describe("Reception walk-in request validation", () => {
  it("accepts an existing patient, doctor, and two distinct supported identity elements", () => {
    expect(receptionWalkInRegistrationRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects an empty patient ID", () => {
    expect(receptionWalkInRegistrationRequestSchema.safeParse({ ...validRequest, patientId: " " }).success).toBe(false);
  });

  it("rejects an empty doctor ID", () => {
    expect(receptionWalkInRegistrationRequestSchema.safeParse({ ...validRequest, doctorId: "" }).success).toBe(false);
  });

  it("requires the identity object", () => {
    const withoutIdentity = { patientId: validRequest.patientId, doctorId: validRequest.doctorId };
    expect(receptionWalkInRegistrationRequestSchema.safeParse(withoutIdentity).success).toBe(false);
  });

  it("rejects repeated identity element types", () => {
    expect(receptionWalkInRegistrationRequestSchema.safeParse({
      ...validRequest,
      identity: {
        firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
        secondIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
      },
    }).success).toBe(false);
  });

  it("rejects caller-supplied queue, status, appointment, or actor fields", () => {
    expect(receptionWalkInRegistrationRequestSchema.safeParse({
      ...validRequest,
      queueNumber: 1,
      type: "APPOINTMENT",
      status: "CALLED",
      appointmentId: "forged_appointment",
      createdByEmployeeId: "forged_employee",
    }).success).toBe(false);
  });

  it("rejects an invalid date of birth identifier", () => {
    expect(receptionWalkInRegistrationRequestSchema.safeParse({
      ...validRequest,
      identity: {
        firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
        secondIdentifier: { type: "DATE_OF_BIRTH", value: "1990-02-31" },
      },
    }).success).toBe(false);
  });
});
