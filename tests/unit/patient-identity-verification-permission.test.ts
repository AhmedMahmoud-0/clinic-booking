import { describe, expect, it } from "vitest";

import { hasEmployeePermission } from "../../src/server/auth/authorization/policy";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";

describe("patient identity verification permission", () => {
  it("allows staff who directly identify patients during clinic workflows", () => {
    for (const role of [
      "RECEPTION",
      "DOCTOR",
      "NURSE",
      "LAB_STAFF",
      "RADIOLOGY_STAFF",
      "RADIOLOGIST",
      "CASHIER",
    ]) {
      expect(hasEmployeePermission([role], CLINIC_PERMISSIONS.PATIENT_IDENTITY_VERIFY)).toBe(true);
    }
  });

  it("does not grant patient identity verification to Clinic Manager or System Admin", () => {
    expect(hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.PATIENT_IDENTITY_VERIFY)).toBe(false);
    expect(hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.PATIENT_IDENTITY_VERIFY)).toBe(false);
  });
});
