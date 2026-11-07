import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../server/clinic-master-data/http";
import { createLabTest } from "../../../../../server/diagnostic-master-data/diagnostic-master-data";
import { createLabTestSchema } from "../../../../../server/diagnostic-master-data/validation";

export const runtime = "nodejs";

export const POST = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  async (request, actor): Promise<Response> => {
    const input = await parseClinicMasterDataJson(request, createLabTestSchema);
    const data = await createLabTest(input, actor.employeeId);
    return clinicMasterDataJson({ success: true, data }, 201);
  },
  toClinicMasterDataErrorResponse,
);
