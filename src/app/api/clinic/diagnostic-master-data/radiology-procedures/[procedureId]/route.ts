import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../../server/clinic-master-data/http";
import { updateRadiologyProcedure } from "../../../../../../server/diagnostic-master-data/diagnostic-master-data";
import { radiologyProcedurePatchSchema } from "../../../../../../server/diagnostic-master-data/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ procedureId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { procedureId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseClinicMasterDataJson(securedRequest, radiologyProcedurePatchSchema);
      const data = await updateRadiologyProcedure(procedureId, input, actor.employeeId);
      return clinicMasterDataJson({ success: true, data });
    },
    toClinicMasterDataErrorResponse,
  )(request);
}
