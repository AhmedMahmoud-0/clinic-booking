import {
  withEmployeePermissionRoute,
} from "../../../../../server/auth/authorization/route-guards";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { linkPatientAccount } from "../../../../../server/auth/account-linking/patient-link";
import { patientAccountLinkSchema } from "../../../../../server/auth/account-linking/validation";

export const runtime = "nodejs";

export const POST = withEmployeePermissionRoute(
  "patient.account.link",
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
    const parsed = patientAccountLinkSchema.safeParse(body);

    if (!parsed.success) {
      return accountLinkJson(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "The patient account-linking details are invalid.",
          },
        },
        400,
      );
    }

    const result = await linkPatientAccount(parsed.data, actor.employeeId);

    if (!result.linked) {
      return accountLinkJson(
        {
          error: {
            code: "IDENTITY_NOT_VERIFIED",
            message: "The supplied identity details could not be verified. No account was linked.",
          },
        },
        422,
      );
    }

    return accountLinkJson({ success: true, patientAccountId: result.patientAccountId });
  },
  toAccountLinkErrorResponse,
);
