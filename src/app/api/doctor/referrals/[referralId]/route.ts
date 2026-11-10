import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import {
  DoctorReferralLifecycleError,
  transitionDoctorReferral,
} from "../../../../../server/appointments/doctor-referral-lifecycle";
import {
  doctorReferralIdSchema,
  doctorReferralLifecycleRequestSchema,
} from "../../../../../server/appointments/doctor-referral-lifecycle-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ referralId: string }> };

function hasUnexpectedQuery(request: Request): boolean {
  return new URL(request.url).search !== "";
}

function toReferralLifecycleErrorResponse(error: unknown): Response {
  if (error instanceof DoctorReferralLifecycleError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Accept, complete, or cancel a referral using server-resolved Doctor identity and status transitions. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { referralId: rawReferralId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_REFERRAL_LIFECYCLE_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the referral action as a JSON object.", 415);
      }

      const referralId = doctorReferralIdSchema.safeParse(rawReferralId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorReferralLifecycleRequestSchema.safeParse(body);
      if (!referralId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_REFERRAL_LIFECYCLE_REQUEST",
            message: "Provide exactly one supported action: ACCEPT, COMPLETE, or CANCEL. Actor, referral target, status, and timestamps are server-controlled.",
          },
        }, 400);
      }

      const result = await transitionDoctorReferral(referralId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toReferralLifecycleErrorResponse,
  )(request);
}
