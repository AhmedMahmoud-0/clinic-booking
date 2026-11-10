import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { markReceptionAppointmentNoShow } from "../../../../../../server/appointments/reception-appointment-no-show";
import {
  receptionAppointmentNoShowIdSchema,
  receptionAppointmentNoShowRequestSchema,
} from "../../../../../../server/appointments/reception-appointment-no-show-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

function toReceptionNoShowErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Explicitly record an eligible Reception no-show; the client supplies no status, reason, or actor. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId: rawAppointmentId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object to record the no-show.", 415);
      }

      const appointmentId = receptionAppointmentNoShowIdSchema.safeParse(rawAppointmentId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = receptionAppointmentNoShowRequestSchema.safeParse(body);
      if (!appointmentId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RECEPTION_APPOINTMENT_NO_SHOW_REQUEST",
            message: "Provide a valid appointment ID and an empty JSON object. Patient, status, reason, and actor are determined by the server.",
          },
        }, 400);
      }

      const result = await markReceptionAppointmentNoShow(appointmentId.data, actor.employeeId);
      return accountLinkJson({ success: true, noShow: result }, 200);
    },
    toReceptionNoShowErrorResponse,
  )(request);
}
