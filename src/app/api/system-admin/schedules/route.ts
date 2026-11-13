import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { getSystemAdminSchedules } from "@/server/system-admin/admin";
import { systemAdminJson } from "@/server/system-admin/http";

export const runtime = "nodejs";

export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  async (): Promise<Response> => systemAdminJson({ success: true, schedules: await getSystemAdminSchedules() }),
);
