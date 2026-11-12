import { withEmployeePermissionRoute } from "../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../server/auth/account-linking/common";
import { applyNurseTaskAction, NursingWorkflowError } from "../../../../../server/appointments/nursing-workflow";
import { nurseTaskActionRequestSchema, nursingTaskIdSchema } from "../../../../../server/appointments/nursing-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ taskId: string }> };
function toNursingErrorResponse(error: unknown): Response {
  if (error instanceof NursingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { taskId: raw } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.NURSING_TASK_MANAGE, async (secured, actor) => {
    assertAccountLinkOrigin(secured);
    if (new URL(secured.url).search !== "") return accountLinkJson({ error: { code: "INVALID_NURSE_TASK_ACTION", message: "Query parameters are not supported." } }, 400);
    if (!secured.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the task action as a JSON object.", 415);
    const taskId = nursingTaskIdSchema.safeParse(raw);
    const body: unknown = await secured.json().catch(() => null);
    const parsed = nurseTaskActionRequestSchema.safeParse(body);
    if (!taskId.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_NURSE_TASK_ACTION", message: "Provide START, COMPLETE, or ESCALATE. An escalation note is required only for ESCALATE." } }, 400);
    const result = await applyNurseTaskAction(taskId.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, ...result }, 200);
  }, toNursingErrorResponse)(request);
}
