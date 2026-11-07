import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { createCatalogService } from "../../../../../server/clinic-master-data/master-data";
import { createServiceSchema } from "../../../../../server/clinic-master-data/master-data-validation";
import {
  clinicMasterDataJson,
  parseClinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

export const POST = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  async (request, actor): Promise<Response> => {
    const input = await parseClinicMasterDataJson(request, createServiceSchema);
    const data = await createCatalogService(input, actor.employeeId);
    return clinicMasterDataJson({ success: true, data }, 201);
  },
  toClinicMasterDataErrorResponse,
);
