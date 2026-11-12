import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { getNurseTaskVitalSigns, NursingWorkflowError, recordNurseTaskVitalSigns } from "../../../../../../server/appointments/nursing-workflow";
import { nurseVitalSignRequestSchema, nursingTaskIdSchema } from "../../../../../../server/appointments/nursing-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ taskId: string }> };
function toNursingErrorResponse(error: unknown): Response {
  if (error instanceof NursingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { taskId: raw } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.NURSING_CONTEXT_READ, async (secured, actor) => {
    if (new URL(secured.url).search !== "") return accountLinkJson({ error: { code: "INVALID_NURSE_VITALS_REQUEST", message: "Query parameters are not supported." } }, 400);
    const taskId = nursingTaskIdSchema.safeParse(raw);
    if (!taskId.success) return accountLinkJson({ error: { code: "INVALID_NURSE_VITALS_REQUEST", message: "A valid task ID is required." } }, 400);
    const result = await getNurseTaskVitalSigns(taskId.data, actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, toNursingErrorResponse)(request);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { taskId: raw } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.NURSING_VITALS_RECORD, async (secured, actor) => {
    assertAccountLinkOrigin(secured);
    if (new URL(secured.url).search !== "") return accountLinkJson({ error: { code: "INVALID_NURSE_VITALS_REQUEST", message: "Query parameters are not supported." } }, 400);
    if (!secured.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the vital-sign measurements as a JSON object.", 415);
    const taskId = nursingTaskIdSchema.safeParse(raw);
    const body: unknown = await secured.json().catch(() => null);
    const parsed = nurseVitalSignRequestSchema.safeParse(body);
    if (!taskId.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_NURSE_VITALS_REQUEST", message: "Provide at least one plausible measurement. Blood-pressure values must be supplied together; BMI and measurement time are server-controlled." } }, 400);
    const result = await recordNurseTaskVitalSigns(taskId.data, actor.employeeId, parsed.data);
    return accountLinkJson({ success: true, ...result }, 201);
  }, toNursingErrorResponse)(request);
}
