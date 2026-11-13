import { withEmployeePermissionRoute } from "@/server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "@/server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "@/server/auth/account-linking/common";
import { recordReceptionComplaint } from "@/server/clinic-manager/operations";
import { createReceptionComplaintSchema } from "@/server/clinic-manager/operations-validation";

export const runtime = "nodejs";

export const POST = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.COMPLAINT_INTAKE,
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the complaint as JSON.", 415);
    }
    const body: unknown = await request.json().catch(() => null);
    const parsed = createReceptionComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_COMPLAINT_INTAKE",
          message: "Provide a valid intake channel, category, subject, and description of at least 20 characters.",
        },
      }, 400);
    }
    const complaint = await recordReceptionComplaint(actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, complaint }, 201);
  },
  toAccountLinkErrorResponse,
);
