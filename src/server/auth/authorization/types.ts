export const EMPLOYEE_ROLES = [
  "RECEPTION",
  "DOCTOR",
  "NURSE",
  "LAB_STAFF",
  "RADIOLOGY_STAFF",
  "RADIOLOGIST",
  "CASHIER",
  "CLINIC_MANAGER",
  "SYSTEM_ADMIN",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const EMPLOYEE_WORKSPACES = [
  "RECEPTION",
  "DOCTOR",
  "NURSE",
  "LABORATORY",
  "RADIOLOGY",
  "CASHIER",
  "CLINIC_MANAGER",
  "SYSTEM_ADMIN",
] as const;

export type EmployeeWorkspace = (typeof EMPLOYEE_WORKSPACES)[number];

export const PATIENT_ACCESS_SCOPES = [
  "VIEW_PROFILE",
  "MANAGE_PROFILE",
  "BOOK_APPOINTMENTS",
  "MANAGE_APPOINTMENTS",
  "VIEW_BILLING",
  "VIEW_MEDICAL_RECORDS",
  "VIEW_DIAGNOSTIC_RESULTS",
] as const;

export type PatientAccessScope = (typeof PATIENT_ACCESS_SCOPES)[number];

/**
 * Coarse-grained capabilities for the approved clinic roles.
 * Resource ownership, assignment, record state, and workflow rules are checked
 * separately by each server-side data-access/service function.
 */
export const CLINIC_PERMISSIONS = {
  EMPLOYEE_ACCOUNT_LINK: "employee.account.link",
  PATIENT_ACCOUNT_LINK: "patient.account.link",
  PATIENT_DELEGATION_MANAGE: "patient.delegation.manage",
  PATIENT_CONTACT_READ: "patient.contact.read",
  PATIENT_CONTACT_MANAGE: "patient.contact.manage",
  PATIENT_CONSENT_READ: "patient.consent.read",
  PATIENT_CONSENT_RECORD: "patient.consent.record",
  PATIENT_DOCUMENT_READ: "patient.document.read",
  PATIENT_DOCUMENT_UPLOAD: "patient.document.upload",
  PATIENT_RELATIONSHIP_READ: "patient.relationship.read",
  PATIENT_RELATIONSHIP_MANAGE: "patient.relationship.manage",
  PATIENT_BASIC_READ: "patient.basic.read",
  PATIENT_BASIC_MANAGE: "patient.basic.manage",
  PATIENT_IDENTITY_VERIFY: "patient.identity.verify",
  APPOINTMENT_MANAGE: "appointment.manage",
  APPOINTMENT_PATIENT_OVERLAP_OVERRIDE: "appointment.patient-overlap.override",
  QUEUE_MANAGE: "queue.manage",
  COMPLAINT_INTAKE: "complaint.intake",
  COMPLAINT_MANAGE: "complaint.manage",
  CLINICAL_ASSIGNED_READ: "clinical.assigned.read",
  CLINICAL_ENCOUNTER_MANAGE: "clinical.encounter.manage",
  CLINICAL_ORDER_CREATE: "clinical.order.create",
  CLINICAL_RESULT_REVIEW: "clinical.result.review",
  NURSING_CONTEXT_READ: "nursing.context.read",
  NURSING_VITALS_RECORD: "nursing.vitals.record",
  NURSING_TASK_MANAGE: "nursing.task.manage",
  LAB_WORKFLOW_MANAGE: "laboratory.workflow.manage",
  RADIOLOGY_WORKFLOW_MANAGE: "radiology.workflow.manage",
  RADIOLOGY_REPORT_APPROVE: "radiology.report.approve",
  RADIOLOGY_CRITICAL_COMMUNICATION_MANAGE: "radiology.critical-communication.manage",
  BILLING_READ: "billing.read",
  INVOICE_MANAGE: "billing.invoice.manage",
  PAYMENT_COLLECT: "payment.collect",
  REFUND_REQUEST: "refund.request",
  DISCOUNT_APPROVE: "discount.approve",
  REFUND_APPROVE: "refund.approve",
  OPERATIONS_REPORT_READ: "operations.report.read",
  INCIDENT_MANAGE: "incident.manage",
  STAFF_OVERSIGHT_READ: "staff.oversight.read",
  CLINIC_MASTER_DATA_MANAGE: "clinic.master-data.manage",
  SYSTEM_USER_MANAGE: "system.user.manage",
  SYSTEM_ROLE_MANAGE: "system.role.manage",
  SYSTEM_SETTINGS_MANAGE: "system.settings.manage",
  AUDIT_LOG_READ: "audit-log.read",
} as const;

export type ClinicPermission =
  (typeof CLINIC_PERMISSIONS)[keyof typeof CLINIC_PERMISSIONS];

export interface EmployeeIdentityContext {
  employeeId: string;
  roles: EmployeeRole[];
}

export interface PatientIdentityContext {
  patientId: string;
}

export interface CurrentAuthActor {
  userId: string;
  emailVerified: boolean;
  employee: EmployeeIdentityContext | null;
  patient: PatientIdentityContext | null;
}

export interface EmployeeAuthorizationContext {
  userId: string;
  employeeId: string;
  roles: EmployeeRole[];
  permissions: ClinicPermission[];
}

export interface EmployeeWorkspaceAuthorizationContext
  extends EmployeeAuthorizationContext {
  workspace: EmployeeWorkspace;
}

export interface PatientAuthorizationContext {
  userId: string;
  patientId: string;
}

export interface PatientRecordAccessContext {
  patientId: string;
  granteePatientId: string;
  scope: PatientAccessScope;
  accessType: "SELF" | "DELEGATED";
  grantId: string | null;
}
