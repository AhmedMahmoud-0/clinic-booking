import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import { createDoctorNursingTask, getDoctorEncounterNursingTasks, NursingWorkflowError } from "../../../../../../server/appointments/nursing-workflow";
import { createNursingTaskRequestSchema, nursingEncounterIdSchema } from "../../../../../../server/appointments/nursing-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ encounterId: string }> };
function toNursingErrorResponse(error: unknown): Response {
  if (error instanceof NursingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
function hasUnexpectedQuery(request: Request) { return new URL(request.url).search !== ""; }

/** Read nursing tasks for the authenticated Doctor's own Encounter. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: raw } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ, async (secured, actor) => {
    if (hasUnexpectedQuery(secured)) return accountLinkJson({ error: { code: "INVALID_NURSING_TASK_REQUEST", message: "Query parameters are not supported." } }, 400);
    const parsedId = nursingEncounterIdSchema.safeParse(raw);
    if (!parsedId.success) return accountLinkJson({ error: { code: "INVALID_NURSING_TASK_REQUEST", message: "A valid Encounter ID is required." } }, 400);
    const result = await getDoctorEncounterNursingTasks(parsedId.data, actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, toNursingErrorResponse)(request);
}

/** Assign a nursing task to an active Nurse for this Doctor-owned Encounter. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: raw } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE, async (secured, actor) => {
    assertAccountLinkOrigin(secured);
    if (hasUnexpectedQuery(secured)) return accountLinkJson({ error: { code: "INVALID_NURSING_TASK_REQUEST", message: "Query parameters are not supported." } }, 400);
    if (!secured.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send the nursing task as a JSON object.", 415);
    const parsedId = nursingEncounterIdSchema.safeParse(raw);
    const body: unknown = await secured.json().catch(() => null);
    const parsedBody = createNursingTaskRequestSchema.safeParse(body);
    if (!parsedId.success || !parsedBody.success) return accountLinkJson({ error: { code: "INVALID_NURSING_TASK_REQUEST", message: "Provide an active Nurse employee ID, supported task type, optional instructions, and optional offset-aware due time. Encounter, Doctor, creator, and task status are server-controlled." } }, 400);
    const result = await createDoctorNursingTask(parsedId.data, actor.employeeId, parsedBody.data);
    return accountLinkJson({ success: true, ...result }, 201);
  }, toNursingErrorResponse)(request);
}
