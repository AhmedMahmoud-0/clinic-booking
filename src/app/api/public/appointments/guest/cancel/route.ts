import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { cancelGuestAppointment } from "../../../../../../server/appointments/guest-appointment-cancellation";
import { guestAppointmentCancellationRequestSchema } from "../../../../../../server/appointments/guest-appointment-cancellation-validation";

export const runtime = "nodejs";

function toGuestCancellationErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/**
 * Public guest cancellation. The bearer management token is accepted only in
 * the strict JSON body; it is never placed in a URL, query string, or response.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = guestAppointmentCancellationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_GUEST_APPOINTMENT_CANCELLATION_REQUEST",
          message: "Provide the guest management token issued when the appointment was booked.",
        },
      }, 400);
    }

    const result = await cancelGuestAppointment(parsed.data.managementToken);
    return accountLinkJson({ success: true, data: result }, 200);
  } catch (error) {
    return toGuestCancellationErrorResponse(error);
  }
}
