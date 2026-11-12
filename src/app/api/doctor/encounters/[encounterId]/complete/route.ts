import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { AccountLinkError, accountLinkJson, assertAccountLinkOrigin, toAccountLinkErrorResponse } from "../../../../../../server/auth/account-linking/common";
import { completeDoctorEncounter, NursingWorkflowError } from "../../../../../../server/appointments/nursing-workflow";
import { completeDoctorEncounterRequestSchema, nursingEncounterIdSchema } from "../../../../../../server/appointments/nursing-workflow-validation";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ encounterId: string }> };
function toNursingErrorResponse(error: unknown): Response {
  if (error instanceof NursingWorkflowError) return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  return toAccountLinkErrorResponse(error);
}
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: raw } = await context.params;
  return withEmployeePermissionRoute(CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE, async (secured, actor) => {
    assertAccountLinkOrigin(secured);
    if (new URL(secured.url).search !== "") return accountLinkJson({ error: { code: "INVALID_ENCOUNTER_COMPLETION_REQUEST", message: "Query parameters are not supported." } }, 400);
    if (!secured.headers.get("content-type")?.includes("application/json")) throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object to complete the Encounter.", 415);
    const encounterId = nursingEncounterIdSchema.safeParse(raw);
    const body: unknown = await secured.json().catch(() => null);
    const parsed = completeDoctorEncounterRequestSchema.safeParse(body);
    if (!encounterId.success || !parsed.success) return accountLinkJson({ error: { code: "INVALID_ENCOUNTER_COMPLETION_REQUEST", message: "Provide a valid Encounter ID and an empty JSON object. Completion status, timestamps, and actors are server-controlled." } }, 400);
    const result = await completeDoctorEncounter(encounterId.data, actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 200);
  }, toNursingErrorResponse)(request);
}
