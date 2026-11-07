import { hasEmployeePermission } from "./policy";
import { CLINIC_PERMISSIONS } from "./types";
import type { ClinicPermission, EmployeeWorkspace } from "./types";

/**
 * Minimum capability required to enter each staff workspace.
 * These checks only authorize entry to the workspace shell. Every operation
 * inside it must still enforce its own permission, resource, assignment,
 * record-state, and separation-of-duties rules.
 */
export const EMPLOYEE_WORKSPACE_PERMISSIONS: Readonly<
  Record<EmployeeWorkspace, readonly ClinicPermission[]>
> = {
  RECEPTION: [CLINIC_PERMISSIONS.PATIENT_BASIC_READ],
  DOCTOR: [CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ],
  NURSE: [CLINIC_PERMISSIONS.NURSING_CONTEXT_READ],
  LABORATORY: [CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE],
  // Radiologists enter the same workspace for report approval; this does not
  // grant them the Radiology Staff workflow-management capability.
  RADIOLOGY: [
    CLINIC_PERMISSIONS.RADIOLOGY_WORKFLOW_MANAGE,
    CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE,
  ],
  CASHIER: [CLINIC_PERMISSIONS.BILLING_READ],
  CLINIC_MANAGER: [CLINIC_PERMISSIONS.OPERATIONS_REPORT_READ],
  SYSTEM_ADMIN: [CLINIC_PERMISSIONS.SYSTEM_USER_MANAGE],
};

export function canAccessEmployeeWorkspace(
  roles: readonly string[],
  workspace: EmployeeWorkspace,
): boolean {
  return EMPLOYEE_WORKSPACE_PERMISSIONS[workspace].some((permission) =>
    hasEmployeePermission(roles, permission),
  );
}
