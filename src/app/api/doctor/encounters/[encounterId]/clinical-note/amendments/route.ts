import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../../server/auth/account-linking/common";
import {
  DoctorClinicalNoteAmendmentError,
  amendDoctorClinicalNote,
  getDoctorClinicalNoteAmendmentHistory,
} from "../../../../../../../server/appointments/doctor-clinical-note-amendment";
import {
  doctorClinicalNoteAmendmentRequestSchema,
  doctorClinicalNoteEncounterIdSchema,
} from "../../../../../../../server/appointments/doctor-clinical-note-amendment-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorClinicalNoteAmendmentErrorResponse(error: unknown): Response {
  if (error instanceof DoctorClinicalNoteAmendmentError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Read the authenticated Doctor's signed-note amendment history. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    async (securedRequest, actor): Promise<Response> => {
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_AMENDMENT_REQUEST",
            message: "Query parameters are not supported.",
          },
        }, 400);
      }
      const encounterId = doctorClinicalNoteEncounterIdSchema.safeParse(rawEncounterId);
      if (!encounterId.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_AMENDMENT_REQUEST",
            message: "Provide a valid Encounter ID.",
          },
        }, 400);
      }
      const result = await getDoctorClinicalNoteAmendmentHistory(encounterId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorClinicalNoteAmendmentErrorResponse,
  )(request);
}

/** Append a correction to the authenticated Doctor's own signed initial assessment. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_AMENDMENT_REQUEST",
            message: "Query parameters are not supported.",
          },
        }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the clinical-note amendment as a JSON object.", 415);
      }

      const encounterId = doctorClinicalNoteEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorClinicalNoteAmendmentRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_CLINICAL_NOTE_AMENDMENT_REQUEST",
            message: "Provide a valid Encounter ID, a correction reason, and at least one supported clinical-note field. Previous content, corrected snapshots, author, and timestamps are server-controlled.",
          },
        }, 400);
      }

      const result = await amendDoctorClinicalNote(encounterId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorClinicalNoteAmendmentErrorResponse,
  )(request);
}
