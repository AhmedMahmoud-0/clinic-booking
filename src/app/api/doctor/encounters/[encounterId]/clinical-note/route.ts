import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import {
  DoctorClinicalNoteError,
  saveDoctorClinicalNoteDraft,
} from "../../../../../../server/appointments/doctor-clinical-note";
import {
  doctorClinicalNoteDraftRequestSchema,
  doctorClinicalNoteEncounterIdSchema,
} from "../../../../../../server/appointments/doctor-clinical-note-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorClinicalNoteErrorResponse(error: unknown): Response {
  if (error instanceof DoctorClinicalNoteError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Replace the authenticated Doctor's unsigned initial-assessment draft. */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;

  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);

      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_REQUEST",
            message: "The Doctor clinical-note endpoint does not accept query parameters.",
          },
        }, 400);
      }

      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the clinical-note draft as a JSON object.", 415);
      }

      const encounterId = doctorClinicalNoteEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorClinicalNoteDraftRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_REQUEST",
            message: "Provide a valid Encounter ID, a non-empty chief complaint, and supported clinical text fields only. Identity, author, note status, diagnosis IDs, and timestamps are server-controlled or handled by separate workflows.",
          },
        }, 400);
      }

      const result = await saveDoctorClinicalNoteDraft(encounterId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorClinicalNoteErrorResponse,
  )(request);
}
