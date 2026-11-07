import "server-only";

import { requireEmployeePermission } from "./actor";
import { authorizationErrorResponse, AuthorizationError } from "./errors";
import { requirePatientRecordAccess } from "./patient-access";
import { requireEmployeeWorkspace, requirePatientPortalAccess } from "./workspaces";
import type {
  ClinicPermission,
  EmployeeAuthorizationContext,
  EmployeeWorkspace,
  EmployeeWorkspaceAuthorizationContext,
  PatientAccessScope,
  PatientAuthorizationContext,
  PatientRecordAccessContext,
} from "./types";

type RouteErrorMapper = (error: unknown) => Response;
type RouteHandler<TContext> = (
  request: Request,
  context: TContext,
) => Promise<Response> | Response;
type ContextResolver<TContext> = (request: Request) => Promise<TContext>;

/**
 * Common Route Handler boundary. Authentication/authorization failures become
 * minimal no-store 401/403 responses. Unexpected failures are rethrown so the
 * application's normal error handling remains visible to server monitoring.
 */
function withResolvedRouteContext<TContext>(
  resolveContext: ContextResolver<TContext>,
  handler: RouteHandler<TContext>,
  mapHandlerError?: RouteErrorMapper,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    try {
      const context = await resolveContext(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return authorizationErrorResponse(error);
      }

      if (mapHandlerError) {
        return mapHandlerError(error);
      }

      throw error;
    }
  };
}

/** Protect a Route Handler with one operation-specific employee permission. */
export function withEmployeePermissionRoute(
  permission: ClinicPermission,
  handler: RouteHandler<EmployeeAuthorizationContext>,
  mapHandlerError?: RouteErrorMapper,
): (request: Request) => Promise<Response> {
  return withResolvedRouteContext(
    async () => requireEmployeePermission(permission),
    handler,
    mapHandlerError,
  );
}

/** Protect a workspace-shell Route Handler; operations still need own guards. */
export function withEmployeeWorkspaceRoute(
  workspace: EmployeeWorkspace,
  handler: RouteHandler<EmployeeWorkspaceAuthorizationContext>,
  mapHandlerError?: RouteErrorMapper,
): (request: Request) => Promise<Response> {
  return withResolvedRouteContext(
    async () => requireEmployeeWorkspace(workspace),
    handler,
    mapHandlerError,
  );
}

/** Protect patient-portal endpoints that require a verified patient identity. */
export function withPatientPortalRoute(
  handler: RouteHandler<PatientAuthorizationContext>,
  mapHandlerError?: RouteErrorMapper,
): (request: Request) => Promise<Response> {
  return withResolvedRouteContext(
    async () => requirePatientPortalAccess(),
    handler,
    mapHandlerError,
  );
}

/** Protect a patient-record endpoint with one exact self/delegated scope. */
export function withPatientRecordRoute(
  resolveSubjectPatientId: (request: Request) => string | Promise<string>,
  scope: PatientAccessScope,
  handler: RouteHandler<PatientRecordAccessContext>,
  mapHandlerError?: RouteErrorMapper,
): (request: Request) => Promise<Response> {
  return withResolvedRouteContext(
    async (request) =>
      requirePatientRecordAccess(await resolveSubjectPatientId(request), scope),
    handler,
    mapHandlerError,
  );
}
