import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import { accountLinkJson, toAccountLinkErrorResponse } from "../../../../server/auth/account-linking/common";
import { getNurseAssignedTasks, NursingWorkflowError } from "../../../../server/appointments/nursing-workflow";

export const runtime = "nodejs";
function toNursingErrorResponse(error: unknown): Response {
  if (error instanceof NursingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function GET(request: Request): Promise<Response> {
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.NURSING_TASK_MANAGE, async (secured, actor) => {
    if (new URL(secured.url).search !== "") return accountLinkJson({ error: { code: "INVALID_NURSE_TASK_LIST_REQUEST", message: "Query parameters are not supported." } }, 400);
    const result = await getNurseAssignedTasks(actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, toNursingErrorResponse)(request);
}
