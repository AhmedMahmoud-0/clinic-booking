import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../../server/auth/account-linking/common";
import {
  DoctorPrescriptionError,
  updateDoctorPrescriptionDraft,
} from "../../../../../../../server/appointments/doctor-prescription";
import {
  doctorPrescriptionDraftRequestSchema,
  doctorPrescriptionEncounterIdSchema,
  doctorPrescriptionIdSchema,
} from "../../../../../../../server/appointments/doctor-prescription-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string; prescriptionId: string }> };

function toDoctorPrescriptionErrorResponse(error: unknown): Response {
  if (error instanceof DoctorPrescriptionError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

/** Replace the medication rows of the authenticated Doctor's own unsigned draft only. */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId, prescriptionId: rawPrescriptionId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_PRESCRIPTION_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the full prescription draft as a JSON object.", 415);
      }
      const encounterId = doctorPrescriptionEncounterIdSchema.safeParse(rawEncounterId);
      const prescriptionId = doctorPrescriptionIdSchema.safeParse(rawPrescriptionId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorPrescriptionDraftRequestSchema.safeParse(body);
      if (!encounterId.success || !prescriptionId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_PRESCRIPTION_REQUEST",
            message: "Provide valid Encounter and prescription IDs and 1–20 valid medication items. Status, author, patient, Encounter, issue timestamp, and item IDs are server-controlled.",
          },
        }, 400);
      }
      const result = await updateDoctorPrescriptionDraft(
        encounterId.data,
        prescriptionId.data,
        actor.employeeId,
        parsedBody.data,
      );
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorPrescriptionErrorResponse,
  )(request);
}
