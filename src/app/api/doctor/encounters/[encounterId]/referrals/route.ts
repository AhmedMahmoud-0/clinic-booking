import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import {
  createDoctorReferral,
  DoctorReferralError,
  getDoctorEncounterReferrals,
} from "../../../../../../server/appointments/doctor-referral";
import {
  doctorReferralEncounterIdSchema,
  doctorReferralRequestSchema,
} from "../../../../../../server/appointments/doctor-referral-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorReferralErrorResponse(error: unknown): Response {
  if (error instanceof DoctorReferralError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

function hasUnexpectedQuery(request: Request): boolean {
  return new URL(request.url).search !== "";
}

/** Read referrals attached to the authenticated Doctor's own active Encounter. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    async (securedRequest, actor): Promise<Response> => {
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_REFERRALS_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      const encounterId = doctorReferralEncounterIdSchema.safeParse(rawEncounterId);
      if (!encounterId.success) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_REFERRALS_REQUEST", message: "A valid Encounter ID is required." },
        }, 400);
      }
      const result = await getDoctorEncounterReferrals(encounterId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorReferralErrorResponse,
  )(request);
}

/** Create a PENDING referral for the authenticated Doctor's own active Encounter. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_REFERRALS_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the referral as a JSON object.", 415);
      }
      const encounterId = doctorReferralEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorReferralRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_REFERRAL_REQUEST",
            message: "Provide an internal specialty/Doctor target or an external facility, plus a bounded reason and optional instructions. Encounter, patient, author, status, and timestamps are server-controlled.",
          },
        }, 400);
      }
      const result = await createDoctorReferral(encounterId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 201);
    },
    toDoctorReferralErrorResponse,
  )(request);
}
