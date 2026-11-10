import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import {
  DoctorDiagnosisError,
  addDoctorEncounterDiagnosis,
  getDoctorEncounterDiagnoses,
} from "../../../../../../server/appointments/doctor-diagnosis";
import {
  doctorDiagnosisAddRequestSchema,
  doctorDiagnosisEncounterIdSchema,
} from "../../../../../../server/appointments/doctor-diagnosis-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorDiagnosisErrorResponse(error: unknown): Response {
  if (error instanceof DoctorDiagnosisError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

function hasUnexpectedQuery(request: Request): boolean {
  return new URL(request.url).search !== "";
}

/** Read coded diagnoses for the authenticated Doctor's active Encounter. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_DIAGNOSES_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      const encounterId = doctorDiagnosisEncounterIdSchema.safeParse(rawEncounterId);
      if (!encounterId.success) {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_DIAGNOSES_REQUEST", message: "A valid Encounter ID is required." } }, 400);
      }
      const result = await getDoctorEncounterDiagnoses(encounterId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorDiagnosisErrorResponse,
  )(request);
}

/** Add one diagnosis from the active catalogue to the authenticated Doctor's Encounter. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_DIAGNOSES_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the diagnosis selection as a JSON object.", 415);
      }
      const encounterId = doctorDiagnosisEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorDiagnosisAddRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_DIAGNOSES_REQUEST",
            message: "Provide a valid diagnosis ID, optional notes, and an optional primary flag. Patient, Doctor, actor, catalog text, and timestamps are server-controlled.",
          },
        }, 400);
      }
      const result = await addDoctorEncounterDiagnosis(encounterId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 201);
    },
    toDoctorDiagnosisErrorResponse,
  )(request);
}
