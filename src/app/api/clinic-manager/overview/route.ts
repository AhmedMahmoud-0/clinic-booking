import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { getClinicManagerOverview } from "../../../../server/clinic-manager/overview";
import { clinicManagerJson } from "../../../../server/clinic-manager/http";

export const runtime = "nodejs";

/** Aggregate-only operational dashboard. Clinical record details are never returned. */
export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.OPERATIONS_REPORT_READ,
  async (): Promise<Response> =>
    clinicManagerJson({ success: true, overview: await getClinicManagerOverview() }),
);
