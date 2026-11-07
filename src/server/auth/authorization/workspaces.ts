import "server-only";

import { requireEmployeeActor, requirePatientActor } from "./actor";
import { AuthorizationError } from "./errors";
import { canAccessEmployeeWorkspace } from "./workspace-policy";
import type {
  EmployeeWorkspace,
  EmployeeWorkspaceAuthorizationContext,
  PatientAuthorizationContext,
} from "./types";

/**
 * Resolve the signed-in employee from the database and authorize entry to a
 * workspace shell. This is not a substitute for operation-level permissions.
 */
export async function requireEmployeeWorkspace(
  workspace: EmployeeWorkspace,
): Promise<EmployeeWorkspaceAuthorizationContext> {
  const actor = await requireEmployeeActor();

  if (!canAccessEmployeeWorkspace(actor.roles, workspace)) {
    throw new AuthorizationError(
      "INSUFFICIENT_WORKSPACE_ACCESS",
      "Your employee role is not permitted to access this workspace.",
      403,
    );
  }

  return { ...actor, workspace };
}

/**
 * Resolve the verified patient identity before entering the patient portal.
 * Individual record queries must still call requirePatientRecordAccess with
 * the exact requested data scope.
 */
export async function requirePatientPortalAccess(): Promise<PatientAuthorizationContext> {
  return requirePatientActor();
}
