import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { getClinicManagerStaffOverview } from "../../../../server/clinic-manager/overview";
import { clinicManagerJson } from "../../../../server/clinic-manager/http";

export const runtime = "nodejs";

export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.STAFF_OVERSIGHT_READ,
  async (): Promise<Response> =>
    clinicManagerJson({ success: true, staff: await getClinicManagerStaffOverview() }),
);
