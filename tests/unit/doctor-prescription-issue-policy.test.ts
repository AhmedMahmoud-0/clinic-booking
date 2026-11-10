import { describe, expect, it } from "vitest";
import { decideDoctorPrescriptionIssue } from "../../src/server/appointments/doctor-prescription-policy";

const validDraft = {
  prescriptionExists: true,
  prescriptionStatus: "DRAFT",
  prescribedByEmployeeId: "employee_1",
  actorEmployeeId: "employee_1",
  issuedAtExists: false,
  itemCount: 1,
};

describe("Doctor prescription issuance policy", () => {
  it("allows the original prescriber to issue a complete draft", () => {
    expect(decideDoctorPrescriptionIssue(validDraft)).toEqual({ kind: "ISSUE" });
  });

  it("allows the maximum supported item count", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, itemCount: 20 })).toEqual({ kind: "ISSUE" });
  });

  it("rejects a missing prescription", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, prescriptionExists: false })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_NOT_FOUND",
    });
  });

  it("rejects a prescription that is already issued", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, prescriptionStatus: "ISSUED", issuedAtExists: true })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_NOT_ISSUABLE",
    });
  });

  it("rejects a cancelled prescription", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, prescriptionStatus: "CANCELLED" })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_NOT_ISSUABLE",
    });
  });

  it("rejects unknown prescription states", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, prescriptionStatus: "UNKNOWN" })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_NOT_ISSUABLE",
    });
  });

  it("rejects a draft with an issue timestamp", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, issuedAtExists: true })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_STATE_INCONSISTENT",
    });
  });

  it("rejects an actor other than the original prescriber", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, actorEmployeeId: "employee_2" })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_AUTHOR_MISMATCH",
    });
  });

  it("rejects an empty prescription", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, itemCount: 0 })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_ITEMS_INVALID",
    });
  });

  it("rejects more than 20 items", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, itemCount: 21 })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_ITEMS_INVALID",
    });
  });

  it("rejects a non-integer item count", () => {
    expect(decideDoctorPrescriptionIssue({ ...validDraft, itemCount: 1.5 })).toEqual({
      kind: "REJECT",
      code: "PRESCRIPTION_ITEMS_INVALID",
    });
  });
});
