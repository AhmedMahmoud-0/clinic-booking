import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../server/auth/account-linking/common";
import { getLabWorklist, LabWorkflowError } from "../../../../server/laboratory/lab-workflow";

export const runtime = "nodejs";

function toLabWorkflowErrorResponse(error: unknown): Response {
  if (error instanceof LabWorkflowError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.LAB_WORKFLOW_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({ error: { code: "INVALID_LAB_WORKLIST_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      const result = await getLabWorklist(actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toLabWorkflowErrorResponse,
  )(request);
}
