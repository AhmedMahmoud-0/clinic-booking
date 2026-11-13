import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { getPatientAppointment } from "../../../../../server/patient-portal/read-model";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ appointmentId: string }> };

/** Return one appointment only when it belongs to the authenticated patient. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { appointmentId } = await context.params;
  return withPatientPortalRoute(
    async (_securedRequest, actor): Promise<Response> => {
      if (!appointmentId || appointmentId.length > 128) {
        return accountLinkJson({ error: { code: "APPOINTMENT_NOT_FOUND", message: "The appointment was not found." } }, 404);
      }
      const appointment = await getPatientAppointment(actor.patientId, appointmentId);
      if (!appointment) {
        return accountLinkJson({ error: { code: "APPOINTMENT_NOT_FOUND", message: "The appointment was not found." } }, 404);
      }
      return accountLinkJson({ appointment });
    },
    toAccountLinkErrorResponse,
  )(request);
}
