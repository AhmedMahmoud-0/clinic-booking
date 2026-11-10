import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../server/appointments/appointment-booking-errors";
import { registerReceptionWalkIn } from "../../../../server/appointments/walk-in-registration";
import { receptionWalkInRegistrationRequestSchema } from "../../../../server/appointments/walk-in-registration-validation";

export const runtime = "nodejs";

function toReceptionWalkInErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Register an existing active patient as a doctor-specific walk-in queue ticket. */
export async function POST(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send a JSON object containing patientId, doctorId, and two identity elements.", 415);
      }

      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = receptionWalkInRegistrationRequestSchema.safeParse(body);
      if (!parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RECEPTION_WALK_IN_REQUEST",
            message: "Provide an existing patientId, doctorId, and two distinct supported identity elements. Queue number, ticket type, status, actor, and timestamps are determined by the server.",
          },
        }, 400);
      }

      const result = await registerReceptionWalkIn(
        parsedBody.data.patientId,
        parsedBody.data.doctorId,
        parsedBody.data.identity,
        actor.employeeId,
      );
      return accountLinkJson({ success: true, walkIn: result }, 201);
    },
    toReceptionWalkInErrorResponse,
  )(request);
}
