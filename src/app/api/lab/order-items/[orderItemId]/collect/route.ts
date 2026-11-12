import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { collectLabSample, LabWorkflowError } from "../../../../../../server/laboratory/lab-workflow";
import { labOrderItemIdSchema, labSampleCollectionRequestSchema } from "../../../../../../server/laboratory/lab-workflow-validation";

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
        return accountLinkJson({ error: { code: "INVALID_LAB_SAMPLE_COLLECTION_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the sample-collection details as a JSON object.", 415);
      }
      const orderItemId = labOrderItemIdSchema.safeParse(rawOrderItemId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsed = labSampleCollectionRequestSchema.safeParse(body);
      if (!orderItemId.success || !parsed.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_LAB_SAMPLE_COLLECTION_REQUEST",
            message: "Provide the existing two-element patient identity-verification object and optional collection notes. Identity values are checked in memory and are never stored.",
          },
        }, 400);
      }
      const result = await collectLabSample(orderItemId.data, actor.employeeId, parsed.data);
      if (!result.identityVerified) {
        return accountLinkJson({
          success: false,
          error: { code: "PATIENT_IDENTITY_NOT_VERIFIED", message: "The two identity elements did not match the linked patient record. No sample was collected." },
        }, 409);
      }
      return accountLinkJson({ success: true, ...result }, 201);
    },
    toLabWorkflowErrorResponse,
  )(request);
}
