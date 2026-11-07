import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../../server/clinic-master-data/http";
import { updateLabTestComponent } from "../../../../../../server/diagnostic-master-data/diagnostic-master-data";
import { labTestComponentPatchSchema } from "../../../../../../server/diagnostic-master-data/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ componentId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { componentId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseClinicMasterDataJson(securedRequest, labTestComponentPatchSchema);
      const data = await updateLabTestComponent(componentId, input, actor.employeeId);
      return clinicMasterDataJson({ success: true, data });
    },
    toClinicMasterDataErrorResponse,
  )(request);
}
