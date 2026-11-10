import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import {
  DoctorLabOrderError,
  searchDoctorLabCatalog,
} from "../../../../server/appointments/doctor-lab-order";
import { doctorLabCatalogQuerySchema } from "../../../../server/appointments/doctor-lab-order-validation";

export const runtime = "nodejs";

function toDoctorLabOrderErrorResponse(error: unknown): Response {
  if (error instanceof DoctorLabOrderError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Search active clinic tests for a Doctor; catalog labels are not clinical advice. */
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE,
    async (securedRequest, actor): Promise<Response> => {
      const url = new URL(securedRequest.url);
      const keys = [...url.searchParams.keys()];
      if (keys.some((key) => key !== "q") || url.searchParams.getAll("q").length > 1) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_LAB_CATALOG_REQUEST",
            message: "Only one optional q search parameter is supported.",
          },
        }, 400);
      }
      const parsedQuery = doctorLabCatalogQuerySchema.safeParse(url.searchParams.get("q") ?? undefined);
      if (!parsedQuery.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_LAB_CATALOG_REQUEST",
            message: "The laboratory search term must be 80 characters or fewer.",
          },
        }, 400);
      }
      const result = await searchDoctorLabCatalog(actor.employeeId, parsedQuery.data);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorLabOrderErrorResponse,
  )(request);
}
