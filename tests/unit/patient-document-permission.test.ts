import { describe, expect, it } from "vitest";
import {
  hasEmployeePermission,
  ROLE_PERMISSIONS,
} from "../../src/server/auth/authorization/policy";
import {
  CLINIC_PERMISSIONS,
  EMPLOYEE_ROLES,
} from "../../src/server/auth/authorization/types";

describe("patient document permissions", () => {
  it("grants document read only to Reception in this increment", () => {
    for (const role of EMPLOYEE_ROLES) {
      expect(
        hasEmployeePermission([role], CLINIC_PERMISSIONS.PATIENT_DOCUMENT_READ),
      ).toBe(role === "RECEPTION");
    }
  });

  it("grants document upload only to Reception in this increment", () => {
    for (const role of EMPLOYEE_ROLES) {
      expect(
        hasEmployeePermission([role], CLINIC_PERMISSIONS.PATIENT_DOCUMENT_UPLOAD),
      ).toBe(role === "RECEPTION");
    }
  });

  it("does not infer document access from basic patient-read", () => {
    // Clinic Manager and System Admin intentionally do not have basic patient-read.
    // Test the other non-Reception roles that actually possess that permission.
    const nonReceptionRolesWithBasicPatientRead = EMPLOYEE_ROLES.filter(
      (role) =>
        role !== "RECEPTION" &&
        ROLE_PERMISSIONS[role].includes(CLINIC_PERMISSIONS.PATIENT_BASIC_READ),
    );

    expect(nonReceptionRolesWithBasicPatientRead.length).toBeGreaterThan(0);

    for (const role of nonReceptionRolesWithBasicPatientRead) {
      expect(
        hasEmployeePermission([role], CLINIC_PERMISSIONS.PATIENT_DOCUMENT_READ),
      ).toBe(false);
      expect(
        hasEmployeePermission([role], CLINIC_PERMISSIONS.PATIENT_DOCUMENT_UPLOAD),
      ).toBe(false);
    }
  });

  it("does not add patient-document permissions to System Admin", () => {
    expect(ROLE_PERMISSIONS.SYSTEM_ADMIN).not.toContain(
      CLINIC_PERMISSIONS.PATIENT_DOCUMENT_READ,
    );
    expect(ROLE_PERMISSIONS.SYSTEM_ADMIN).not.toContain(
      CLINIC_PERMISSIONS.PATIENT_DOCUMENT_UPLOAD,
    );
  });

  it("preserves existing reception patient permissions", () => {
    expect(ROLE_PERMISSIONS.RECEPTION).toContain(
      CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    );
    expect(ROLE_PERMISSIONS.RECEPTION).toContain(
      CLINIC_PERMISSIONS.PATIENT_BASIC_MANAGE,
    );
  });

  it("keeps the employee role catalog unchanged", () => {
    expect(EMPLOYEE_ROLES).toHaveLength(9);
  });
});
