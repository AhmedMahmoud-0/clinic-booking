import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import {
  DoctorDiagnosisError,
  searchDoctorDiagnosisCatalog,
} from "../../../../server/appointments/doctor-diagnosis";
import { doctorDiagnosisCatalogQuerySchema } from "../../../../server/appointments/doctor-diagnosis-validation";

export const runtime = "nodejs";

function toDoctorDiagnosisErrorResponse(error: unknown): Response {
  if (error instanceof DoctorDiagnosisError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Search only active catalogue entries; this is reference data, not diagnostic advice. */
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const url = new URL(securedRequest.url);
      const keys = [...url.searchParams.keys()];
      if (keys.some((key) => key !== "q") || url.searchParams.getAll("q").length > 1) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_DIAGNOSIS_CATALOG_REQUEST",
            message: "Only one optional q search parameter is supported.",
          },
        }, 400);
      }
      const parsedQuery = doctorDiagnosisCatalogQuerySchema.safeParse(url.searchParams.get("q") ?? undefined);
      if (!parsedQuery.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_DIAGNOSIS_CATALOG_REQUEST",
            message: "The diagnosis search term must be 80 characters or fewer.",
          },
        }, 400);
      }
      const result = await searchDoctorDiagnosisCatalog(actor.employeeId, parsedQuery.data);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorDiagnosisErrorResponse,
  )(request);
}
