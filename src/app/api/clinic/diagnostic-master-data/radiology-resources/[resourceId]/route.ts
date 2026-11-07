import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../../server/clinic-master-data/http";
import { updateRadiologyResource } from "../../../../../../server/diagnostic-master-data/diagnostic-master-data";
import { radiologyResourcePatchSchema } from "../../../../../../server/diagnostic-master-data/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ resourceId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { resourceId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseClinicMasterDataJson(securedRequest, radiologyResourcePatchSchema);
      const data = await updateRadiologyResource(resourceId, input, actor.employeeId);
      return clinicMasterDataJson({ success: true, data });
    },
    toClinicMasterDataErrorResponse,
  )(request);
}
