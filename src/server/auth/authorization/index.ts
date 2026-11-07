export {
  getCurrentAuthActor,
  requireAuthenticatedActor,
  requireEmployeeActor,
  requireEmployeePermission,
  requireEmployeeRole,
  requirePatientActor,
} from "./actor";
export {
  authorizationErrorResponse,
  AuthorizationError,
} from "./errors";
export {
  requirePatientRecordAccess,
} from "./patient-access";
export {
  withEmployeePermissionRoute,
  withEmployeeWorkspaceRoute,
  withPatientPortalRoute,
  withPatientRecordRoute,
} from "./route-guards";
export {
  withEmployeeDataAccess,
  withPatientRecordDataAccess,
} from "./data-access";
export {
  requireEmployeeWorkspace,
  requirePatientPortalAccess,
} from "./workspaces";
export { canAccessEmployeeWorkspace, EMPLOYEE_WORKSPACE_PERMISSIONS } from "./workspace-policy";
export { CLINIC_PERMISSIONS } from "./types";
export type {
  ClinicPermission,
  CurrentAuthActor,
  EmployeeAuthorizationContext,
  EmployeeRole,
  EmployeeWorkspace,
  EmployeeWorkspaceAuthorizationContext,
  PatientAccessScope,
  PatientAuthorizationContext,
  PatientRecordAccessContext,
} from "./types";
