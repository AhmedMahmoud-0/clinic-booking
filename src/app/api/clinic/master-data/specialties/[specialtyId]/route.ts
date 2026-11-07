import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { updateSpecialty } from "../../../../../../server/clinic-master-data/master-data";
import { specialtyPatchSchema } from "../../../../../../server/clinic-master-data/master-data-validation";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ specialtyId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { specialtyId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseClinicMasterDataJson(securedRequest, specialtyPatchSchema);
      const data = await updateSpecialty(specialtyId, input, actor.employeeId);
      return clinicMasterDataJson({ success: true, data });
    },
    toClinicMasterDataErrorResponse,
  )(request);
}
