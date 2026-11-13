import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { getSystemAdminAuditLogs } from "@/server/system-admin/admin";
import { systemAdminJson } from "@/server/system-admin/http";
import { auditLogQuerySchema } from "@/server/system-admin/validation";

export const runtime = "nodejs";

export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.AUDIT_LOG_READ,
  async (request): Promise<Response> => {
    const parsed = auditLogQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return systemAdminJson({ error: { code: "INVALID_AUDIT_FILTER", message: "Choose a valid audit filter." } }, 400);
    return systemAdminJson({ success: true, audit: await getSystemAdminAuditLogs(parsed.data) });
  },
);
