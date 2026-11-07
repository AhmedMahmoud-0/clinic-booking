import "server-only";

import { requireEmployeePermission } from "./actor";
import { requirePatientRecordAccess } from "./patient-access";
import type {
  ClinicPermission,
  EmployeeAuthorizationContext,
  PatientAccessScope,
  PatientRecordAccessContext,
} from "./types";

/**
 * Run a server-side domain query or mutation only after resolving the current
 * employee and checking the operation-specific capability.
 *
 * The callback must apply resource ownership/assignment, record-state, and
 * separation-of-duties checks, and return a minimal DTO (never a raw Prisma
 * model). This helper intentionally does not decide domain-specific rules.
 */
export async function withEmployeeDataAccess<T>(
  permission: ClinicPermission,
  operation: (actor: EmployeeAuthorizationContext) => Promise<T>,
): Promise<T> {
  const actor = await requireEmployeePermission(permission);
  return operation(actor);
}

/**
 * Run a patient-scoped server query only after self/delegated access is checked
 * for the exact requested scope. The callback must return a minimal DTO and
 * must not broaden the grant to other patient data or scopes.
 */
export async function withPatientRecordDataAccess<T>(
  subjectPatientId: string,
  scope: PatientAccessScope,
  operation: (access: PatientRecordAccessContext) => Promise<T>,
): Promise<T> {
  const access = await requirePatientRecordAccess(subjectPatientId, scope);
  return operation(access);
}
