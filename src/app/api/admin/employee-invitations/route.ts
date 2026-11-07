import {
  withEmployeePermissionRoute,
} from "../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import { createEmployeeInvitation } from "../../../../server/auth/invitations/employee-invitation";
import { employeeInvitationRequestSchema } from "../../../../server/auth/invitations/employee-invitation-validation";

export const runtime = "nodejs";

/** Issue or resend an invitation to the work email on an existing active employee record. */
export const POST = withEmployeePermissionRoute(
  "employee.account.link",
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = employeeInvitationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_REQUEST",
          message: "The employee invitation details are invalid.",
        },
      }, 400);
    }

    const result = await createEmployeeInvitation(parsed.data, actor.employeeId);
    return accountLinkJson({
      success: true,
      email: result.email,
      expiresAt: result.expiresAt.toISOString(),
    }, 202);
  },
  toAccountLinkErrorResponse,
);
