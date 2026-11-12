import { describe, expect, it } from "vitest";
import { getEmployeePermissions } from "../../src/server/auth/authorization/policy";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";

describe("Phase 8I–8J least-privilege radiology permissions", () => {
  it("keeps exam execution with Radiology Staff and report lifecycle with Radiologists", () => {
    const staff = getEmployeePermissions(["RADIOLOGY_STAFF"]);
    const radiologist = getEmployeePermissions(["RADIOLOGIST"]);

    expect(staff).toContain(CLINIC_PERMISSIONS.RADIOLOGY_WORKFLOW_MANAGE);
    expect(staff).not.toContain(CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE);
    expect(radiologist).toContain(CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE);
    expect(radiologist).not.toContain(CLINIC_PERMISSIONS.RADIOLOGY_WORKFLOW_MANAGE);
  });

  it("preserves the audited patient-overlap override as a Reception-only permission", () => {
    expect(getEmployeePermissions(["RECEPTION"])).toContain(CLINIC_PERMISSIONS.APPOINTMENT_PATIENT_OVERLAP_OVERRIDE);
    for (const role of ["DOCTOR", "NURSE", "LAB_STAFF", "RADIOLOGY_STAFF", "RADIOLOGIST", "CASHIER", "CLINIC_MANAGER", "SYSTEM_ADMIN"]) {
      expect(getEmployeePermissions([role])).not.toContain(CLINIC_PERMISSIONS.APPOINTMENT_PATIENT_OVERLAP_OVERRIDE);
    }
  });

  it("grants the separate critical-communication capability to both appropriate roles", () => {
    expect(getEmployeePermissions(["RADIOLOGY_STAFF"])).toContain(CLINIC_PERMISSIONS.RADIOLOGY_CRITICAL_COMMUNICATION_MANAGE);
    expect(getEmployeePermissions(["RADIOLOGIST"])).toContain(CLINIC_PERMISSIONS.RADIOLOGY_CRITICAL_COMMUNICATION_MANAGE);
    expect(getEmployeePermissions(["DOCTOR"])).not.toContain(CLINIC_PERMISSIONS.RADIOLOGY_CRITICAL_COMMUNICATION_MANAGE);
  });
});
