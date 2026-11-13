import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { getSystemAdminRoleCatalog } from "@/server/system-admin/admin";
import { systemAdminJson } from "@/server/system-admin/http";

export const runtime = "nodejs";

export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.SYSTEM_ROLE_MANAGE,
  async (): Promise<Response> => systemAdminJson({ success: true, roles: getSystemAdminRoleCatalog() }),
);
