import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import { AppointmentBookingError } from "../../../../server/appointments/appointment-booking-errors";
import { getReceptionDoctorQueue } from "../../../../server/appointments/reception-queue";
import { receptionQueueDoctorIdSchema } from "../../../../server/appointments/reception-queue-validation";

export const runtime = "nodejs";

function toReceptionQueueErrorResponse(error: unknown): Response {
  if (error instanceof AppointmentBookingError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Read the current Cairo-local-day queue for one doctor; no clinical data is returned. */
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.APPOINTMENT_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      const url = new URL(securedRequest.url);
      const parsedDoctorId = receptionQueueDoctorIdSchema.safeParse(url.searchParams.get("doctorId"));
      if (!parsedDoctorId.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_RECEPTION_QUEUE_QUERY",
            message: "Provide a valid doctorId to view that doctor's current-day Reception queue.",
          },
        }, 400);
      }

      const queue = await getReceptionDoctorQueue(parsedDoctorId.data, actor.employeeId);
      return accountLinkJson({ success: true, queue }, 200);
    },
    toReceptionQueueErrorResponse,
  )(request);
}
