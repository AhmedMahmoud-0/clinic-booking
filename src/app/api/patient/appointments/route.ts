import { withPatientPortalRoute } from "../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../server/appointments/appointment-booking-errors";
import { createPatientAppointment } from "../../../../server/appointments/appointment-booking";
import { createPatientAppointmentSchema } from "../../../../server/appointments/appointment-booking-validation";

export const runtime = "nodejs";

function toAppointmentRouteErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({
      error: { code: error.code, message: error.message },
    }, error.status);
  }

  return toAccountLinkErrorResponse(error);
}

/**
 * Creates an appointment for the authenticated patient or for a patient
 * covered by that actor's exact BOOK_APPOINTMENTS delegation scope.
 * This increment intentionally excludes guest and Reception booking.
 */
export const POST = withPatientPortalRoute(
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = createPatientAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_REQUEST",
          message: "Provide the patient, doctor, service, and an exact available appointment time.",
        },
      }, 400);
    }

    const appointment = await createPatientAppointment(parsed.data, actor.patientId);
    return accountLinkJson({ success: true, appointment }, 201);
  },
  toAppointmentRouteErrorResponse,
);
