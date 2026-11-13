import { withPatientPortalRoute } from "../../../../../../../server/auth/authorization/route-guards";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../../server/auth/account-linking/common";
import { markPatientNotificationRead } from "../../../../../../../server/patient-portal/update76-read-model";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ notificationId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { notificationId } = await context.params;
  return withPatientPortalRoute(
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (!notificationId.trim()) throw new AccountLinkError("NOTIFICATION_NOT_FOUND", "The notification was not found.", 404);
      const updated = await markPatientNotificationRead(actor.patientId, notificationId);
      if (!updated) return accountLinkJson({ error: { code: "NOTIFICATION_NOT_FOUND", message: "The notification was not found." } }, 404);
      return accountLinkJson({ success: true });
    },
    toAccountLinkErrorResponse,
  )(request);
}
