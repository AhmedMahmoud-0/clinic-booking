import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import { clinicManagerJson } from "@/server/clinic-manager/http";
import { getClinicManagerOperationalReport } from "@/server/clinic-manager/operations";
import { operationalReportQuerySchema } from "@/server/clinic-manager/operations-validation";

export const runtime = "nodejs";

export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.OPERATIONS_REPORT_READ,
  async (request): Promise<Response> => {
    const parsed = operationalReportQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return clinicManagerJson({ error: { code: "INVALID_OPERATIONAL_REPORT_QUERY", message: "Provide a valid date range of no more than 93 calendar days." } }, 400);
    const report = await getClinicManagerOperationalReport(parsed.data);
    return clinicManagerJson({ success: true, report });
  },
);
