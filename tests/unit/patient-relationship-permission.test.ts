import { describe, expect, it } from "vitest";
import { CLINIC_PERMISSIONS, EMPLOYEE_ROLES } from "../../src/server/auth/authorization/types";
import { hasEmployeePermission } from "../../src/server/auth/authorization/policy";

describe("patient family relationship permissions", () => {
  it("grants relationship read and management to Reception", () => {
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_READ)).toBe(true);
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE)).toBe(true);
  });

  it("does not grant family relationship access to other employee roles", () => {
    for (const role of EMPLOYEE_ROLES.filter((role) => role !== "RECEPTION")) {
      expect(hasEmployeePermission([role], CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_READ)).toBe(false);
      expect(hasEmployeePermission([role], CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE)).toBe(false);
    }
  });

  it("does not infer family relationship management from System Admin delegation management", () => {
    expect(hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE)).toBe(true);
    expect(hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.PATIENT_RELATIONSHIP_MANAGE)).toBe(false);
  });
});
