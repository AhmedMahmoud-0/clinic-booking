import { hasEmployeePermission } from "../auth/authorization/policy";
import { CLINIC_PERMISSIONS } from "../auth/authorization/types";

/**
 * Only an active Reception employee has the separately scoped permission to
 * authorize a same-patient overlap. Other staff roles, including Clinic Manager
 * and System Admin, do not receive this appointment workflow capability.
 */
export function isPatientAppointmentOverlapExceptionActor(input: {
  employeeStatus: string;
  activeRoles: readonly string[];
}): boolean {
  return input.employeeStatus === "ACTIVE" &&
    input.activeRoles.includes("RECEPTION") &&
    hasEmployeePermission(
      input.activeRoles,
      CLINIC_PERMISSIONS.APPOINTMENT_PATIENT_OVERLAP_OVERRIDE,
    );
}
