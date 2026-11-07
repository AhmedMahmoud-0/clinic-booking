import { describe, expect, it } from "vitest";

import { hasEmployeePermission } from "../../src/server/auth/authorization/policy";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";

describe("clinic master-data management permission", () => {
  it("allows Clinic Manager and System Admin", () => {
    expect(hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE)).toBe(true);
    expect(hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE)).toBe(true);
  });

  it("does not grant master-data management to Reception", () => {
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE)).toBe(false);
  });

  it("does not grant master-data management to clinical or diagnostic staff", () => {
    expect(hasEmployeePermission(["DOCTOR"], CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE)).toBe(false);
    expect(hasEmployeePermission(["LAB_STAFF"], CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE)).toBe(false);
    expect(hasEmployeePermission(["RADIOLOGY_STAFF"], CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE)).toBe(false);
  });
});
