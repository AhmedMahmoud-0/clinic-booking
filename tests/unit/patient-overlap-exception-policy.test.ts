import { describe, expect, it } from "vitest";
import { isPatientAppointmentOverlapExceptionActor } from "../../src/server/appointments/patient-overlap-exception-policy";
import { CLINIC_PERMISSIONS } from "../../src/server/auth/authorization/types";
import { hasEmployeePermission } from "../../src/server/auth/authorization/policy";

describe("patient appointment overlap exception authorization", () => {
  it("grants the dedicated capability to Reception only", () => {
    expect(hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.APPOINTMENT_PATIENT_OVERLAP_OVERRIDE)).toBe(true);
    expect(hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.APPOINTMENT_PATIENT_OVERLAP_OVERRIDE)).toBe(false);
    expect(hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.APPOINTMENT_PATIENT_OVERLAP_OVERRIDE)).toBe(false);
    expect(hasEmployeePermission(["DOCTOR"], CLINIC_PERMISSIONS.APPOINTMENT_PATIENT_OVERLAP_OVERRIDE)).toBe(false);
  });

  it("allows an active Reception employee to authorize an exact overlap", () => {
    expect(isPatientAppointmentOverlapExceptionActor({
      employeeStatus: "ACTIVE",
      activeRoles: ["RECEPTION"],
    })).toBe(true);
  });

  it("rejects an inactive Reception employee", () => {
    expect(isPatientAppointmentOverlapExceptionActor({
      employeeStatus: "INACTIVE",
      activeRoles: ["RECEPTION"],
    })).toBe(false);
  });

  it("rejects other active roles even when their status is active", () => {
    for (const role of ["CLINIC_MANAGER", "SYSTEM_ADMIN", "DOCTOR", "CASHIER"]) {
      expect(isPatientAppointmentOverlapExceptionActor({
        employeeStatus: "ACTIVE",
        activeRoles: [role],
      })).toBe(false);
    }
  });

  it("fails closed without an active Reception assignment", () => {
    expect(isPatientAppointmentOverlapExceptionActor({
      employeeStatus: "ACTIVE",
      activeRoles: [],
    })).toBe(false);
  });
});
