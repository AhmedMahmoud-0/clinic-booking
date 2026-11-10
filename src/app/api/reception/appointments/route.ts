import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../server/appointments/appointment-booking-errors";
import { createReceptionAppointment } from "../../../../server/appointments/appointment-booking";
import { createReceptionAppointmentSchema } from "../../../../server/appointments/reception-appointment-booking-validation";

export const runtime = "nodejs";

function toReceptionAppointmentErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/**
 * Reception booking for an existing active Patient record. Same-patient
 * overlaps are accepted only with a bounded reason code, the dedicated
 * Reception permission, and transaction-bound database audit evidence.
 */
export const POST = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = createReceptionAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_RECEPTION_APPOINTMENT_REQUEST",
          message: "Provide an existing patient, doctor, service, and an exact available appointment time.",
        },
      }, 400);
    }

    const appointment = await createReceptionAppointment(parsed.data, actor.employeeId);
    return accountLinkJson({ success: true, appointment }, 201);
  },
  toReceptionAppointmentErrorResponse,
);
