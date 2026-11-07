import {
  withEmployeePermissionRoute,
} from "../../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { linkEmployeeAccount } from "../../../../../server/auth/account-linking/employee-link";
import { employeeAccountLinkSchema } from "../../../../../server/auth/account-linking/validation";

export const runtime = "nodejs";

export const POST = withEmployeePermissionRoute(
  "employee.account.link",
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError(
        "JSON_REQUIRED",
        "Send the request as JSON.",
        415,
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = employeeAccountLinkSchema.safeParse(body);

    if (!parsed.success) {
      return accountLinkJson(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "The employee account-linking details are invalid.",
          },
        },
        400,
      );
    }

    const result = await linkEmployeeAccount(parsed.data, actor.employeeId);
    return accountLinkJson({ success: true, ...result });
  },
  toAccountLinkErrorResponse,
);
