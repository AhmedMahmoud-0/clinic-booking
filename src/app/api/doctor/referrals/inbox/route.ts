import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import {
  DoctorReferralLifecycleError,
  getDoctorReferralInbox,
} from "../../../../../server/appointments/doctor-referral-lifecycle";

export const runtime = "nodejs";

function hasUnexpectedQuery(request: Request): boolean {
  return new URL(request.url).search !== "";
}

function toReferralInboxErrorResponse(error: unknown): Response {
  if (error instanceof DoctorReferralLifecycleError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Read only open internal referrals addressed to the authenticated Doctor or an active specialty. */
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    async (securedRequest, actor): Promise<Response> => {
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_REFERRAL_INBOX_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      const result = await getDoctorReferralInbox(actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toReferralInboxErrorResponse,
  )(request);
}
