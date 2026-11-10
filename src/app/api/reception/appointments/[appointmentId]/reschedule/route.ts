import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { rescheduleReceptionAppointment } from "../../../../../../server/appointments/reception-appointment-change";
import {
  receptionAppointmentChangeIdSchema,
  receptionAppointmentReschedulingRequestSchema,
} from "../../../../../../server/appointments/reception-appointment-change-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

function toReceptionAppointmentChangeErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Reception rescheduling after patient contact/review; doctor and service remain unchanged. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId: rawAppointmentId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send a JSON object containing the new appointment time and reason code.", 415);
      }

      const appointmentId = receptionAppointmentChangeIdSchema.safeParse(rawAppointmentId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = receptionAppointmentReschedulingRequestSchema.safeParse(body);
      if (!appointmentId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RECEPTION_APPOINTMENT_RESCHEDULING_REQUEST",
            message: "Provide a valid appointment ID, an offset-aware startsAt timestamp, and one approved reason code. Patient, doctor, service, room, duration, price, actor, and status are determined by the server.",
          },
        }, 400);
      }

      const appointment = await rescheduleReceptionAppointment(
        appointmentId.data,
        new Date(parsedBody.data.startsAt),
        parsedBody.data.reasonCode,
        actor.employeeId,
      );
      return accountLinkJson({ success: true, appointment }, 200);
    },
    toReceptionAppointmentChangeErrorResponse,
  )(request);
}
