import {
  CLINIC_PERMISSIONS,
  EMPLOYEE_ROLES,
  type ClinicPermission,
  type EmployeeRole,
} from "./types";

/**
 * Least-privilege role matrix for the approved MERUNO workflows.
 * System Admin deliberately receives no clinical-record permissions.
 * Clinic Manager deliberately receives no technical system-administration
 * permissions. Add narrower permissions only alongside an approved workflow.
 */
export const ROLE_PERMISSIONS: Readonly<
  Record<EmployeeRole, readonly ClinicPermission[]>
> = {
  RECEPTION: [
    CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    CLINIC_PERMISSIONS.PATIENT_BASIC_MANAGE,
    CLINIC_PERMISSIONS.PATIENT_ACCOUNT_LINK,
    CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE,
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    CLINIC_PERMISSIONS.QUEUE_MANAGE,
    CLINIC_PERMISSIONS.COMPLAINT_INTAKE,
  ],
  DOCTOR: [
    CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE,
    CLINIC_PERMISSIONS.CLINICAL_RESULT_REVIEW,
  ],
  NURSE: [
    CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    CLINIC_PERMISSIONS.NURSING_CONTEXT_READ,
    CLINIC_PERMISSIONS.NURSING_VITALS_RECORD,
    CLINIC_PERMISSIONS.NURSING_TASK_MANAGE,
  ],
  LAB_STAFF: [
    CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE,
  ],
  RADIOLOGY_STAFF: [
    CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    CLINIC_PERMISSIONS.RADIOLOGY_WORKFLOW_MANAGE,
  ],
  RADIOLOGIST: [
    CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE,
  ],
  CASHIER: [
    CLINIC_PERMISSIONS.PATIENT_BASIC_READ,
    CLINIC_PERMISSIONS.BILLING_READ,
    CLINIC_PERMISSIONS.PAYMENT_COLLECT,
    CLINIC_PERMISSIONS.REFUND_REQUEST,
  ],
  CLINIC_MANAGER: [
    CLINIC_PERMISSIONS.BILLING_READ,
    CLINIC_PERMISSIONS.DISCOUNT_APPROVE,
    CLINIC_PERMISSIONS.REFUND_APPROVE,
    CLINIC_PERMISSIONS.COMPLAINT_MANAGE,
    CLINIC_PERMISSIONS.INCIDENT_MANAGE,
    CLINIC_PERMISSIONS.OPERATIONS_REPORT_READ,
    CLINIC_PERMISSIONS.STAFF_OVERSIGHT_READ,
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  ],
  SYSTEM_ADMIN: [
    CLINIC_PERMISSIONS.EMPLOYEE_ACCOUNT_LINK,
    CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE,
    CLINIC_PERMISSIONS.PATIENT_ACCOUNT_LINK,
    CLINIC_PERMISSIONS.SYSTEM_USER_MANAGE,
    CLINIC_PERMISSIONS.SYSTEM_ROLE_MANAGE,
    CLINIC_PERMISSIONS.SYSTEM_SETTINGS_MANAGE,
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    CLINIC_PERMISSIONS.AUDIT_LOG_READ,
  ],
};

export function isEmployeeRole(value: string): value is EmployeeRole {
  return (EMPLOYEE_ROLES as readonly string[]).includes(value);
}

export function getEmployeePermissions(
  roles: readonly string[],
): ClinicPermission[] {
  const permissions = new Set<ClinicPermission>();

  for (const role of roles) {
    if (!isEmployeeRole(role)) continue;

    for (const permission of ROLE_PERMISSIONS[role]) {
      permissions.add(permission);
    }
  }

  return [...permissions];
}

export function hasEmployeeRole(
  roles: readonly string[],
  allowedRoles: readonly EmployeeRole[],
): boolean {
  return roles.some((role) => allowedRoles.includes(role as EmployeeRole));
}

export function hasEmployeePermission(
  roles: readonly string[],
  permission: ClinicPermission,
): boolean {
  return getEmployeePermissions(roles).includes(permission);
}
