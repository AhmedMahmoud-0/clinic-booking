import { describe, expect, it } from "vitest";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";
import { hasEmployeePermission } from "../../src/server/auth/authorization/policy";

describe("patient contact and consent permissions", () => {
  it("grants contact-profile management to Reception only", () => {
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_CONTACT_MANAGE)).toBe(true);
    expect(hasEmployeePermission(["DOCTOR"], CLINIC_PERMISSIONS.PATIENT_CONTACT_MANAGE)).toBe(false);
    expect(hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.PATIENT_CONTACT_MANAGE)).toBe(false);
  });
  it("limits contact-profile reading to Reception", () => {
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_CONTACT_READ)).toBe(true);
    expect(hasEmployeePermission(["DOCTOR"], CLINIC_PERMISSIONS.PATIENT_CONTACT_READ)).toBe(false);
    expect(hasEmployeePermission(["CASHIER"], CLINIC_PERMISSIONS.PATIENT_CONTACT_READ)).toBe(false);
  });
  it("limits consent-history reading to Reception and Doctor", () => {
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_CONSENT_READ)).toBe(true);
    expect(hasEmployeePermission(["DOCTOR"], CLINIC_PERMISSIONS.PATIENT_CONSENT_READ)).toBe(true);
    expect(hasEmployeePermission(["NURSE"], CLINIC_PERMISSIONS.PATIENT_CONSENT_READ)).toBe(false);
  });
  it("allows Reception to record consent events", () => expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_CONSENT_RECORD)).toBe(true));
  it("allows Doctor to record consent events", () => expect(hasEmployeePermission(["DOCTOR"], CLINIC_PERMISSIONS.PATIENT_CONSENT_RECORD)).toBe(true));
  it("does not grant consent-record permission to technical System Admin", () => expect(hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.PATIENT_CONSENT_RECORD)).toBe(false));
});
