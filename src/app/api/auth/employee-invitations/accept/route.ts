import { getAuthSession } from "../../../../../server/auth/session";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { acceptEmployeeInvitation } from "../../../../../server/auth/invitations/employee-invitation";
import { employeeInvitationAcceptSchema } from "../../../../../server/auth/invitations/employee-invitation-validation";

export const runtime = "nodejs";

/** Accept an invitation using the currently signed-in Better Auth identity. */
export async function POST(request: Request): Promise<Response> {
  try {
    assertAccountLinkOrigin(request);

    const session = await getAuthSession();
    if (!session) {
      throw new AccountLinkError("AUTHENTICATION_REQUIRED", "Sign in with the invited email address to accept this invitation.", 401);
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = employeeInvitationAcceptSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_REQUEST",
          message: "The employee invitation acceptance details are invalid.",
        },
      }, 400);
    }

    await acceptEmployeeInvitation(session.user.id, parsed.data);
    return accountLinkJson({ success: true });
  } catch (error) {
    return toAccountLinkErrorResponse(error);
  }
}
