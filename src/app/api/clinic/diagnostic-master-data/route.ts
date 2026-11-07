import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { clinicMasterDataJson, toClinicMasterDataErrorResponse } from "../../../../server/clinic-master-data/http";
import { getDiagnosticMasterData } from "../../../../server/diagnostic-master-data/diagnostic-master-data";

export const runtime = "nodejs";

/** Staff-only diagnostic catalog DTO. Contains catalog data only, never orders or patient results. */
export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.CLINIC_MASTER_DATA_MANAGE,
  async (): Promise<Response> => clinicMasterDataJson({ data: await getDiagnosticMasterData() }),
  toClinicMasterDataErrorResponse,
);
