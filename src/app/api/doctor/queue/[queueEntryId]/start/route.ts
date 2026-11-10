import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../../server/appointments/appointment-booking-errors";
import { startDoctorQueueEncounter } from "../../../../../../server/appointments/doctor-encounter-start";
import {
  doctorEncounterStartRequestSchema,
  doctorQueueEntryIdSchema,
} from "../../../../../../server/appointments/doctor-encounter-start-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ queueEntryId: string }> };

function toDoctorEncounterStartErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Start the authenticated Doctor's called queue ticket and its linked Encounter atomically. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { queueEntryId: rawQueueEntryId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_ENCOUNTER_START_REQUEST",
            message: "The Doctor encounter start endpoint does not accept query parameters.",
          },
        }, 400);
      }

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object to start the consultation.", 415);
      }

      const queueEntryId = doctorQueueEntryIdSchema.safeParse(rawQueueEntryId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorEncounterStartRequestSchema.safeParse(body);
      if (!queueEntryId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_ENCOUNTER_START_REQUEST",
            message: "Provide a valid queue ticket ID and an empty JSON object. Patient, appointment, doctor, encounter, status, and actor data are determined by the server.",
          },
        }, 400);
      }

      const result = await startDoctorQueueEncounter(queueEntryId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorEncounterStartErrorResponse,
  )(request);
}
