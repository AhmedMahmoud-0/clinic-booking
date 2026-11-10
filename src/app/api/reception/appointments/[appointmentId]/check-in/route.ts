import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { checkInReceptionAppointment } from "../../../../../../server/appointments/reception-appointment-check-in";
import {
  receptionAppointmentCheckInIdSchema,
  receptionAppointmentCheckInRequestSchema,
} from "../../../../../../server/appointments/reception-appointment-check-in-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

function toReceptionCheckInErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Reception check-in with two-element identity verification and atomic queue creation. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId: rawAppointmentId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send a JSON object containing two patient identity elements.", 415);
      }

      const appointmentId = receptionAppointmentCheckInIdSchema.safeParse(rawAppointmentId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = receptionAppointmentCheckInRequestSchema.safeParse(body);
      if (!appointmentId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RECEPTION_APPOINTMENT_CHECK_IN_REQUEST",
            message: "Provide a valid appointment ID and two distinct supported Patient identity elements. Patient, actor, status, and queue values are determined by the server.",
          },
        }, 400);
      }

      const result = await checkInReceptionAppointment(
        appointmentId.data,
        parsedBody.data.identity,
        parsedBody.data.lateArrivalAccepted === true,
        actor.employeeId,
      );
      return accountLinkJson({ success: true, checkIn: result }, 200);
    },
    toReceptionCheckInErrorResponse,
  )(request);
}
