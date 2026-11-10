import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import {
  createDoctorRadiologyOrder,
  DoctorRadiologyOrderError,
  getDoctorEncounterRadiologyOrders,
} from "../../../../../../server/appointments/doctor-radiology-order";
import {
  doctorRadiologyEncounterIdSchema,
  doctorRadiologyOrderRequestSchema,
} from "../../../../../../server/appointments/doctor-radiology-order-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorRadiologyOrderErrorResponse(error: unknown): Response {
  if (error instanceof DoctorRadiologyOrderError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

function hasUnexpectedQuery(request: Request): boolean {
  return new URL(request.url).search !== "";
}

/** Read radiology orders attached to the authenticated Doctor's active Encounter. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    async (securedRequest, actor): Promise<Response> => {
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_RADIOLOGY_ORDERS_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      const encounterId = doctorRadiologyEncounterIdSchema.safeParse(rawEncounterId);
      if (!encounterId.success) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_RADIOLOGY_ORDERS_REQUEST", message: "A valid Encounter ID is required." },
        }, 400);
      }
      const result = await getDoctorEncounterRadiologyOrders(encounterId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorRadiologyOrderErrorResponse,
  )(request);
}

/** Create an ORDERED radiology request from active catalogue IDs only. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_RADIOLOGY_ORDERS_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the radiology order as a JSON object.", 415);
      }
      const encounterId = doctorRadiologyEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorRadiologyOrderRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_RADIOLOGY_ORDER_REQUEST",
            message: "Select 1–10 distinct active radiology procedure IDs, provide routine/urgent priority, and record whether formal pregnancy screening is required for every digital X-ray. Patient, Doctor, author, status, resources, prices, and procedure labels are server-controlled.",
          },
        }, 400);
      }
      const result = await createDoctorRadiologyOrder(encounterId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 201);
    },
    toDoctorRadiologyOrderErrorResponse,
  )(request);
}
