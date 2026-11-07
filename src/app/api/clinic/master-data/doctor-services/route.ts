import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { upsertDoctorService } from "../../../../../server/clinic-master-data/master-data";
import { doctorServiceUpsertSchema } from "../../../../../server/clinic-master-data/master-data-validation";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

/** Create or update one doctor's service duration and current EGP price. */
export const PUT = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  async (request, actor): Promise<Response> => {
    const input = await parseClinicMasterDataJson(request, doctorServiceUpsertSchema);
    const data = await upsertDoctorService(input, actor.employeeId);
    return clinicMasterDataJson({ success: true, data });
  },
  toClinicMasterDataErrorResponse,
);
