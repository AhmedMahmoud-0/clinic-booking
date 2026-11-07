import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../../server/clinic-master-data/http";
import { updateLabTest } from "../../../../../../server/diagnostic-master-data/diagnostic-master-data";
import { labTestPatchSchema } from "../../../../../../server/diagnostic-master-data/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ labTestId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { labTestId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseClinicMasterDataJson(securedRequest, labTestPatchSchema);
      const data = await updateLabTest(labTestId, input, actor.employeeId);
      return clinicMasterDataJson({ success: true, data });
    },
    toClinicMasterDataErrorResponse,
  )(request);
}
