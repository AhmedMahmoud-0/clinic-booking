import { describe, expect, it } from "vitest";
import { createPatientComplaintSchema } from "../../src/server/patient-portal/update76-validation";

describe("patient complaint submission validation", () => {
  const validComplaint = {
    category: "OTHER",
    subject: "Follow-up on my visit",
    description: "I would like the clinic to review an issue related to my recent visit.",
  };

  it("accepts a valid patient complaint", () => {
    expect(createPatientComplaintSchema.safeParse(validComplaint).success).toBe(true);
  });

  it("rejects descriptions that are too short", () => {
    expect(createPatientComplaintSchema.safeParse({ ...validComplaint, description: "Too short" }).success).toBe(false);
  });

  it("rejects unsupported categories", () => {
    expect(createPatientComplaintSchema.safeParse({ ...validComplaint, category: "MEDICAL_DIAGNOSIS" }).success).toBe(false);
  });

  it("rejects caller-selected patient or status fields", () => {
    expect(createPatientComplaintSchema.safeParse({ ...validComplaint, patientId: "another-patient" }).success).toBe(false);
    expect(createPatientComplaintSchema.safeParse({ ...validComplaint, status: "CLOSED" }).success).toBe(false);
  });

  it("accepts optional record references without accepting arbitrary extra fields", () => {
    expect(createPatientComplaintSchema.safeParse({ ...validComplaint, appointmentId: "own-appointment", invoiceId: "own-invoice" }).success).toBe(true);
    expect(createPatientComplaintSchema.safeParse({ ...validComplaint, employeeId: "forged-employee" }).success).toBe(false);
  });
});
