import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../server/auth/account-linking/common";
import {
  createDoctorPrescriptionDraft,
  DoctorPrescriptionError,
  getDoctorEncounterPrescriptions,
} from "../../../../../../server/appointments/doctor-prescription";
import {
  doctorPrescriptionDraftRequestSchema,
  doctorPrescriptionEncounterIdSchema,
} from "../../../../../../server/appointments/doctor-prescription-validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ encounterId: string }> };

function toDoctorPrescriptionErrorResponse(error: unknown): Response {
  if (error instanceof DoctorPrescriptionError) {
    return accountLinkJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toAccountLinkErrorResponse(error);
}

function hasUnexpectedQuery(request: Request): boolean {
  return new URL(request.url).search !== "";
}

/** Read the prescription history for the authenticated Doctor's own active Encounter. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_PRESCRIPTIONS_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      const encounterId = doctorPrescriptionEncounterIdSchema.safeParse(rawEncounterId);
      if (!encounterId.success) {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_PRESCRIPTIONS_REQUEST", message: "A valid Encounter ID is required." } }, 400);
      }
      const result = await getDoctorEncounterPrescriptions(encounterId.data, actor.employeeId);
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorPrescriptionErrorResponse,
  )(request);
}

/** Create the only editable draft on an active Encounter; this action never issues it. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (hasUnexpectedQuery(securedRequest)) {
        return accountLinkJson({ error: { code: "INVALID_DOCTOR_PRESCRIPTIONS_REQUEST", message: "Query parameters are not supported." } }, 400);
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError("JSON_REQUIRED", "Send the prescription draft as a JSON object.", 415);
      }
      const encounterId = doctorPrescriptionEncounterIdSchema.safeParse(rawEncounterId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorPrescriptionDraftRequestSchema.safeParse(body);
      if (!encounterId.success || !parsedBody.success) {
        return accountLinkJson({
          error: {
            code: "INVALID_DOCTOR_PRESCRIPTION_REQUEST",
            message: "Provide 1–20 medication items with medication name, dosage, frequency, and valid PRN maximum-dose fields when needed. Prescription status, Encounter, patient, prescriber, issue time, and item order are server-controlled.",
          },
        }, 400);
      }
      const result = await createDoctorPrescriptionDraft(encounterId.data, actor.employeeId, parsedBody.data);
      return accountLinkJson({ success: true, ...result }, 201);
    },
    toDoctorPrescriptionErrorResponse,
  )(request);
}
