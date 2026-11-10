import { withPatientPortalRoute } from "../../../../../../server/auth/authorization/route-guards";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { reschedulePatientAppointment } from "../../../../../../server/appointments/patient-appointment-rescheduling";
import {
  patientAppointmentReschedulingIdSchema,
  patientAppointmentReschedulingRequestSchema,
} from "../../../../../../server/appointments/patient-appointment-rescheduling-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

function toPatientAppointmentReschedulingErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Move one confirmed Patient-linked appointment to a newly available time. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId: rawAppointmentId } = await context.params;

  return withPatientPortalRoute(
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send a JSON object containing the new appointment start time.", 415);
      }

      const appointmentId = patientAppointmentReschedulingIdSchema.safeParse(rawAppointmentId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = patientAppointmentReschedulingRequestSchema.safeParse(body);

      if (!appointmentId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RESCHEDULING_REQUEST",
            message: "Provide an appointment ID and a valid ISO timestamp in startsAt. Patient identity, doctor, service, room, and booking details are determined by the server.",
          },
        }, 400);
      }

      const result = await reschedulePatientAppointment(
        appointmentId.data,
        new Date(parsedBody.data.startsAt),
        actor.patientId,
      );

      return accountLinkJson({ success: true, appointment: result });
    },
    toPatientAppointmentReschedulingErrorResponse,
  )(request);
}
