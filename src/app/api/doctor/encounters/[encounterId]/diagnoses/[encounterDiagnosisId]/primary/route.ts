import { withEmployeePermissionRoute } from "../../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../../../server/auth/account-linking/common";
import {
  DoctorDiagnosisError,
  setDoctorEncounterPrimaryDiagnosis,
} from "../../../../../../../../server/appointments/doctor-diagnosis";
import {
  doctorDiagnosisEncounterIdSchema,
  doctorEncounterDiagnosisIdSchema,
  doctorDiagnosisPrimaryRequestSchema,
} from "../../../../../../../../server/appointments/doctor-diagnosis-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string; encounterDiagnosisId: string }> };

function toDoctorDiagnosisErrorResponse(error: unknown): Response {
  if (error instanceof DoctorDiagnosisError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Promote an existing Encounter diagnosis; no diagnosis row is deleted or rewritten. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId, encounterDiagnosisId: rawDiagnosisId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_DIAGNOSIS_PRIMARY_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object to change the primary diagnosis.", 415);
      }
      const encounterId = doctorDiagnosisEncounterIdSchema.safeParse(rawEncounterId);
      const diagnosisId = doctorEncounterDiagnosisIdSchema.safeParse(rawDiagnosisId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorDiagnosisPrimaryRequestSchema.safeParse(body);
      if (!encounterId.success || !diagnosisId.success || !parsedBody.success) {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_DIAGNOSIS_PRIMARY_REQUEST", message: "A valid Encounter diagnosis ID and an empty JSON object are required." } }, 400);
      }
      const result = await setDoctorEncounterPrimaryDiagnosis(encounterId.data, diagnosisId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorDiagnosisErrorResponse,
  )(request);
}
