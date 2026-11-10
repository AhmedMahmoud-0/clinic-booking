import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import {
  DoctorWorklistError,
  getDoctorQueueWorklist,
} from "../../../../server/appointments/doctor-worklist";

export const runtime = "nodejs";

function toDoctorWorklistErrorResponse(error: unknown): Response {
  if (error instanceof DoctorWorklistError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Read the authenticated Doctor's own Cairo-local-day queue. */
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    async (securedRequest, actor): Promise<Response> => {
      const url = new URL(securedRequest.url);
      if (url.search !== "") {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_WORKLIST_QUERY",
            message: "The Doctor worklist does not accept query parameters. The authenticated Doctor profile determines the queue.",
          },
        }, 400);
      }

      const worklist = await getDoctorQueueWorklist(actor.employeeId);
      return accountLinkJson({ success: true, worklist }, 200);
    },
    toDoctorWorklistErrorResponse,
  )(request);
}
