import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../../server/auth/account-linking/common";
import {
  DoctorClinicalNoteSignError,
  signDoctorClinicalNote,
} from "../../../../../../../server/appointments/doctor-clinical-note-sign";
import {
  doctorClinicalNoteEncounterIdSchema,
  doctorClinicalNoteSignRequestSchema,
} from "../../../../../../../server/appointments/doctor-clinical-note-sign-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorClinicalNoteSignErrorResponse(error: unknown): Response {
  if (error instanceof DoctorClinicalNoteSignError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Sign the authenticated Doctor"s own initial-assessment draft. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_SIGN_REQUEST",
            message: "Query parameters are not supported.",
          },
        }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send an empty JSON object to sign the clinical note.", 415);
      }

      const encounterId = doctorClinicalNoteEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorClinicalNoteSignRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_SIGN_REQUEST",
            message: "Provide a valid Encounter ID and an empty JSON object. Note status, signature time, and author are server-controlled.",
          },
        }, 400);
      }

      const result = await signDoctorClinicalNote(encounterId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorClinicalNoteSignErrorResponse,
  )(request);
}
