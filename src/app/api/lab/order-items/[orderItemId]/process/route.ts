import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { LabWorkflowError, startLabProcessing } from "../../../../../../server/laboratory/lab-workflow";
import { labOrderItemIdSchema } from "../../../../../../server/laboratory/lab-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ orderItemId: string }> };

function toLabWorkflowErrorResponse(error: unknown): Response {
  if (error instanceof LabWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { orderItemId: rawOrderItemId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({ error: { code: "INVALID_LAB_PROCESSING_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object to begin processing.", 415);
      }
      const orderItemId = labOrderItemIdSchema.safeParse(rawOrderItemId);
      const body: unknown = await securedRequest.json().catch(() => null);
      if (!orderItemId.success || typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length !== 0) {
        return accountLinkJson({ error: { code: "INVALID_LAB_PROCESSING_REQUEST", message: "A valid order-item ID and an empty JSON object are required." } }, 400);
      }
      const result = await startLabProcessing(orderItemId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toLabWorkflowErrorResponse,
  )(request);
}
