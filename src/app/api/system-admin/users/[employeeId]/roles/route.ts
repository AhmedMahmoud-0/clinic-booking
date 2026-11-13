import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { changeEmployeeRoleAssignment } from "@/server/system-admin/admin";
import { parseSystemAdminJson, systemAdminJson, toSystemAdminErrorResponse } from "@/server/system-admin/http";
import { employeeRoleChangeSchema } from "@/server/system-admin/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ employeeId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { employeeId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.SYSTEM_ROLE_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseSystemAdminJson(securedRequest, employeeRoleChangeSchema);
      const assignment = await changeEmployeeRoleAssignment(employeeId, actor.employeeId, input);
      return systemAdminJson({ success: true, assignment });
    },
    toSystemAdminErrorResponse,
  )(request);
}
