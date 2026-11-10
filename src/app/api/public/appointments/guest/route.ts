import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../server/appointments/appointment-booking-errors";
import { createGuestAppointment } from "../../../../../server/appointments/appointment-booking";
import { createGuestAppointmentSchema } from "../../../../../server/appointments/guest-appointment-booking-validation";

export const runtime = "nodejs";

function toGuestAppointmentErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/**
 * Public guest booking. Origin protection and strict validation apply, but no
 * patient identity is created: Reception must later verify two identifiers
 * before linking the guest contact to a real Patient record.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = createGuestAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_GUEST_APPOINTMENT_REQUEST",
          message: "Provide a full name, valid phone number, doctor, service, and exact available appointment time. Email is optional.",
        },
      }, 400);
    }

    const appointment = await createGuestAppointment(parsed.data);
    return accountLinkJson({ success: true, appointment }, 201);
  } catch (error) {
    return toGuestAppointmentErrorResponse(error);
  }
}
