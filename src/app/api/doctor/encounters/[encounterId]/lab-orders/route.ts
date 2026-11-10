import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import {
  createDoctorLabOrder,
  DoctorLabOrderError,
  getDoctorEncounterLabOrders,
} from "../../../../../../server/appointments/doctor-lab-order";
import {
  doctorLabEncounterIdSchema,
  doctorLabOrderRequestSchema,
} from "../../../../../../server/appointments/doctor-lab-order-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorLabOrderErrorResponse(error: unknown): Response {
  if (error instanceof DoctorLabOrderError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

function hasUnexpectedQuery(request: Request): boolean {
  return new URL(request.url).search !== "";
}

/** Read lab orders attached to the authenticated Doctor's active Encounter. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    async (securedRequest, actor): Promise<Response> => {
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_LAB_ORDERS_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      const encounterId = doctorLabEncounterIdSchema.safeParse(rawEncounterId);
      if (!encounterId.success) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_LAB_ORDERS_REQUEST", message: "A valid Encounter ID is required." },
        }, 400);
      }
      const result = await getDoctorEncounterLabOrders(encounterId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorLabOrderErrorResponse,
  )(request);
}

/** Create an ORDERED lab request for the Encounter using active clinic catalog IDs only. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ORDER_CREATE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({
          error: { code: "INVALID_DOCTOR_LAB_ORDERS_REQUEST", message: "Query parameters are not supported." },
        }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the laboratory order as a JSON object.", 415);
      }
      const encounterId = doctorLabEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorLabOrderRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_LAB_ORDER_REQUEST",
            message: "Select 1–20 distinct active laboratory test IDs and provide an optional priority and bounded clinical note. Patient, Doctor, author, status, prices, and test labels are server-controlled.",
          },
        }, 400);
      }
      const result = await createDoctorLabOrder(encounterId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 201);
    },
    toDoctorLabOrderErrorResponse,
  )(request);
}
