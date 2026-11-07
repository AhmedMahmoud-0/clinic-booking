import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { getClinicMasterData } from "../../../../server/clinic-master-data/master-data";
import {
  clinicMasterDataJson,
  toClinicMasterDataErrorResponse,
} from "../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

/** Staff-only master-data DTO for Clinic Manager and System Admin. */
export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  async (): Promise<Response> =>
    clinicMasterDataJson({ data: await getClinicMasterData() }),
  toClinicMasterDataErrorResponse,
);
