import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../../server/auth/account-linking/common";
import { NursingWorkflowError, resolveDoctorNursingTask } from "../../../../../../../server/appointments/nursing-workflow";
import { nursingEncounterIdSchema, nursingTaskIdSchema, resolveNursingTaskRequestSchema } from "../../../../../../../server/appointments/nursing-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ encounterId: string; taskId: string }> };
function toNursingErrorResponse(error: unknown): Response {
  if (error instanceof NursingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId, taskId: rawTaskId } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE, async (secured, actor) => {
    assertAccountLinkOrigin(secured);
    if (new URL(secured.url).search !== "") return accountLinkJson({ error: { code: "INVALID_NURSING_TASK_RESOLUTION", message: "Query parameters are not supported." } }, 400);
    if (!secured.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the task resolution as a JSON object.", 415);
    const encounterId = nursingEncounterIdSchema.safeParse(rawEncounterId);
    const taskId = nursingTaskIdSchema.safeParse(rawTaskId);
    const body: unknown = await secured.json().catch(() => null);
    const parsed = resolveNursingTaskRequestSchema.safeParse(body);
    if (!encounterId.success || !taskId.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_NURSING_TASK_RESOLUTION", message: "Provide RESUME or CANCEL and a reason. Task state and resolving Doctor are server-controlled." } }, 400);
    const result = await resolveDoctorNursingTask(encounterId.data, taskId.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, ...result }, 200);
  }, toNursingErrorResponse)(request);
}
