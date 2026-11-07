import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { updateCatalogService } from "../../../../../../server/clinic-master-data/master-data";
import { servicePatchSchema } from "../../../../../../server/clinic-master-data/master-data-validation";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ serviceId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { serviceId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseClinicMasterDataJson(securedRequest, servicePatchSchema);
      const data = await updateCatalogService(serviceId, input, actor.employeeId);
      return clinicMasterDataJson({ success: true, data });
    },
    toClinicMasterDataErrorResponse,
  )(request);
}
