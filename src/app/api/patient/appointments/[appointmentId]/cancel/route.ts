import { withPatientPortalRoute } from "../../../../../../server/auth/authorization/route-guards";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { cancelPatientAppointment } from "../../../../../../server/appointments/patient-appointment-cancellation";
import {
  patientAppointmentCancellationRequestSchema,
  patientAppointmentIdSchema,
} from "../../../../../../server/appointments/patient-appointment-cancellation-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

function toPatientAppointmentCancellationErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Cancel one confirmed, Patient-linked appointment at least 24 hours ahead. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId: rawAppointmentId } = await context.params;

  return withPatientPortalRoute(
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object.", 415);
      }

      const appointmentId = patientAppointmentIdSchema.safeParse(rawAppointmentId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = patientAppointmentCancellationRequestSchema.safeParse(body);

      if (!appointmentId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_CANCELLATION_REQUEST",
            message: "Provide an appointment ID and an empty JSON object. Cancellation reason and actor are determined by the server.",
          },
        }, 400);
      }

      const result = await cancelPatientAppointment(appointmentId.data, actor.patientId);
      return accountLinkJson({ success: true, appointment: result });
    },
    toPatientAppointmentCancellationErrorResponse,
  )(request);
}
