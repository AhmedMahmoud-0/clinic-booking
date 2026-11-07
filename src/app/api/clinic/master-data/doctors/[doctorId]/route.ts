import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { updateDoctorProfile } from "../../../../../../server/clinic-master-data/master-data";
import { doctorProfilePatchSchema } from "../../../../../../server/clinic-master-data/master-data-validation";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ doctorId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { doctorId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const input = await parseClinicMasterDataJson(securedRequest, doctorProfilePatchSchema);
      const data = await updateDoctorProfile(doctorId, input, actor.employeeId);
      return clinicMasterDataJson({ success: true, data });
    },
    toClinicMasterDataErrorResponse,
  )(request);
}
