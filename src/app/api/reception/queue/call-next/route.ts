import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../../server/appointments/appointment-booking-errors";
import { callNextReceptionQueueEntry } from "../../../../../server/appointments/reception-queue";
import { receptionQueueCallNextRequestSchema } from "../../../../../server/appointments/reception-queue-validation";

export const runtime = "nodejs";

function toReceptionQueueErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Call the oldest WAITING ticket for a doctor, without allowing client-selected queue state. */
export async function POST(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send a JSON object containing the doctorId.", 415);
      }
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = receptionQueueCallNextRequestSchema.safeParse(body);
      if (!parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RECEPTION_QUEUE_CALL_NEXT_REQUEST",
            message: "Provide only a valid doctorId. Patient, queue entry, status, number, and actor are determined by the server.",
          },
        }, 400);
      }

      const result = await callNextReceptionQueueEntry(parsedBody.data.doctorId, actor.employeeId);
      return accountLinkJson({ success: true, result }, 200);
    },
    toReceptionQueueErrorResponse,
  )(request);
}
