import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { cancelReceptionAppointment } from "../../../../../../server/appointments/reception-appointment-change";
import {
  receptionAppointmentCancellationRequestSchema,
  receptionAppointmentChangeIdSchema,
} from "../../../../../../server/appointments/reception-appointment-change-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

function toReceptionAppointmentChangeErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Reception cancellation of one upcoming confirmed appointment, with a bounded reason and audit actor. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId: rawAppointmentId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send a JSON object containing the cancellation reason code.", 415);
      }

      const appointmentId = receptionAppointmentChangeIdSchema.safeParse(rawAppointmentId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = receptionAppointmentCancellationRequestSchema.safeParse(body);
      if (!appointmentId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RECEPTION_APPOINTMENT_CANCELLATION_REQUEST",
            message: "Provide a valid appointment ID and one approved cancellation reason code. Patient, actor, and status are determined by the server.",
          },
        }, 400);
      }

      const appointment = await cancelReceptionAppointment(
        appointmentId.data,
        parsedBody.data.reasonCode,
        actor.employeeId,
      );
      return accountLinkJson({ success: true, appointment }, 200);
    },
    toReceptionAppointmentChangeErrorResponse,
  )(request);
}
