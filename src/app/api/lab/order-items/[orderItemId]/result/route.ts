import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { LabWorkflowError, saveLabResultDraft } from "../../../../../../server/laboratory/lab-workflow";
import { labOrderItemIdSchema, labResultDraftRequestSchema } from "../../../../../../server/laboratory/lab-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ orderItemId: string }> };

function toLabWorkflowErrorResponse(error: unknown): Response {
  if (error instanceof LabWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const { orderItemId: rawOrderItemId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({ error: { code: "INVALID_LAB_RESULT_DRAFT_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the result draft as a JSON object.", 415);
      }
      const orderItemId = labOrderItemIdSchema.safeParse(rawOrderItemId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsed = labResultDraftRequestSchema.safeParse(body);
      if (!orderItemId.success || !parsed.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_LAB_RESULT_DRAFT_REQUEST",
            message: "Provide a result summary and/or component values with exactly one value type per component. Component names and value types are resolved from the active lab catalogue.",
          },
        }, 400);
      }
      const result = await saveLabResultDraft(orderItemId.data, actor.employeeId, parsed.data);
      return accountLinkJson({ success: true, result }, 200);
    },
    toLabWorkflowErrorResponse,
  )(request);
}
