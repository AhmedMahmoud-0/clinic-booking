import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { replaceDoctorSpecialties } from "../../../../../server/clinic-master-data/master-data";
import { doctorSpecialtyReplaceSchema } from "../../../../../server/clinic-master-data/master-data-validation";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

/** Replace a doctor's complete specialty mapping atomically; exactly one primary is required. */
export const PUT = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  async (request, actor): Promise<Response> => {
    const input = await parseClinicMasterDataJson(request, doctorSpecialtyReplaceSchema);
    const data = await replaceDoctorSpecialties(input.doctorId, input, actor.employeeId);
    return clinicMasterDataJson({ success: true, data });
  },
  toClinicMasterDataErrorResponse,
);
