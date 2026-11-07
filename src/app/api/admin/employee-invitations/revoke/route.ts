import {
  withEmployeePermissionRoute,
} from "../../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { revokeEmployeeInvitation } from "../../../../../server/auth/invitations/employee-invitation";
import { employeeInvitationRevokeSchema } from "../../../../../server/auth/invitations/employee-invitation-validation";

export const runtime = "nodejs";

/** Revoke a pending employee invitation without changing any existing account link. */
export const POST = withEmployeePermissionRoute(
  "employee.account.link",
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = employeeInvitationRevokeSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_REQUEST",
          message: "The employee invitation revocation details are invalid.",
        },
      }, 400);
    }

    await revokeEmployeeInvitation(parsed.data, actor.employeeId);
    return accountLinkJson({ success: true });
  },
  toAccountLinkErrorResponse,
);
