import { getPublicClinicCatalog } from "../../../../server/clinic-master-data/master-data";
import { clinicMasterDataJson, toClinicMasterDataErrorResponse } from "../../../../server/clinic-master-data/http";

export const runtime = "nodejs";

/** Public directory limited to explicitly visible specialties, doctors, and active doctor-service offerings. */
export async function GET(): Promise<Response> {
  try {
    return clinicMasterDataJson({ data: await getPublicClinicCatalog() });
  } catch (error) {
    return toClinicMasterDataErrorResponse(error);
  }
}
