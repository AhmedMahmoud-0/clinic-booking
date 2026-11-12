import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { LabWorkflowError, transitionLabSample } from "../../../../../server/laboratory/lab-workflow";
import { labSampleIdSchema, labSampleTransitionRequestSchema } from "../../../../../server/laboratory/lab-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ sampleId: string }> };

function toLabWorkflowErrorResponse(error: unknown): Response {
  if (error instanceof LabWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { sampleId: rawSampleId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({ error: { code: "INVALID_LAB_SAMPLE_TRANSITION_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send a receive/reject action as a JSON object.", 415);
      }
      const sampleId = labSampleIdSchema.safeParse(rawSampleId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsed = labSampleTransitionRequestSchema.safeParse(body);
      if (!sampleId.success || !parsed.success) {
        return accountLinkJson({ error: { code: "INVALID_LAB_SAMPLE_TRANSITION_REQUEST", message: "Choose RECEIVE or REJECT and provide a reason when rejecting." } }, 400);
      }
      const result = await transitionLabSample(sampleId.data, actor.employeeId, parsed.data);
      return accountLinkJson({ success: true, sample: result }, 200);
    },
    toLabWorkflowErrorResponse,
  )(request);
}
