import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { resolveGuestAppointmentToPatient } from "../../../../../../server/appointments/appointment-booking";
import { resolveGuestAppointmentSchema } from "../../../../../../server/appointments/guest-appointment-resolution-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

function toGuestResolutionErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/**
 * Reception resolves a public guest appointment only after two distinct
 * identity elements match one selected active Patient record. Guest contact
 * information and the one-time guest management token are never identity proof.
 * A same-patient overlap additionally requires the dedicated Reception
 * permission, a bounded reason code, and one audit row per conflicting pair.
 */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
      }

      const body: unknown = await securedRequest.json().catch(() => null);
      const parsed = resolveGuestAppointmentSchema.safeParse(body);
      if (!parsed.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_GUEST_RESOLUTION_REQUEST",
            message: "Select an existing patient and provide two distinct supported identity elements.",
          },
        }, 400);
      }

      const result = await resolveGuestAppointmentToPatient(
        appointmentId,
        parsed.data,
        actor.employeeId,
      );

      if (result.outcome === "IDENTITY_MISMATCH") {
        return accountLinkJson({
          error: {
            code: "PATIENT_IDENTITY_MISMATCH",
            message: "The two supplied identity elements did not both match the selected patient record. The guest appointment remains unresolved.",
          },
          data: {
            appointmentId: result.appointmentId,
            verificationId: result.verificationId,
            result: "FAILED",
          },
        }, 409);
      }

      if (result.outcome === "PATIENT_OVERLAP") {
        return accountLinkJson({
          error: {
            code: "PATIENT_APPOINTMENT_OVERLAP",
            message: "This patient has another overlapping appointment. Resolve the conflict before linking the guest appointment.",
          },
          data: { appointmentId: result.appointmentId, result: "UNRESOLVED" },
        }, 409);
      }

      return accountLinkJson({ success: true, data: result }, 200);
    },
    toGuestResolutionErrorResponse,
  )(request);
}
