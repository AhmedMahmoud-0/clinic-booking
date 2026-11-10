import { withEmployeePermissionRoute } from "../../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../../server/auth/authorization/types";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../../../../server/auth/account-linking/common";
import {
  DoctorPrescriptionError,
  issueDoctorPrescription,
} from "../../../../../../../../server/appointments/doctor-prescription";
import {
  doctorPrescriptionEncounterIdSchema,
  doctorPrescriptionIdSchema,
} from "../../../../../../../../server/appointments/doctor-prescription-validation";
import { doctorPrescriptionIssueRequestSchema } from "../../../../../../../../server/appointments/doctor-prescription-issue-validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ encounterId: string; prescriptionId: string }>;
};

function toDoctorPrescriptionErrorResponse(error: unknown): Response {
  if (error instanceof DoctorPrescriptionError) {
    return accountLinkJson(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }
  return toAccountLinkErrorResponse(error);
}

/** Issue only the authenticated Doctor's own complete draft for their Encounter. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { encounterId: rawEncounterId, prescriptionId: rawPrescriptionId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.CLINICAL_ENCOUNTER_MANAGE,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      if (new URL(securedRequest.url).search !== "") {
        return accountLinkJson(
          {
            error: {
              code: "INVALID_DOCTOR_PRESCRIPTION_ISSUE_REQUEST",
              message: "Query parameters are not supported.",
            },
          },
          400,
        );
      }
      if (!securedRequest.headers.get("content-type")?.includes("application/json")) {
        throw new AccountLinkError(
          "JSON_REQUIRED",
          "Send an empty JSON object to issue the prescription.",
          415,
        );
      }

      const encounterId = doctorPrescriptionEncounterIdSchema.safeParse(rawEncounterId);
      const prescriptionId = doctorPrescriptionIdSchema.safeParse(rawPrescriptionId);
      const body: unknown = await securedRequest.json().catch(() => null);
      const parsedBody = doctorPrescriptionIssueRequestSchema.safeParse(body);
      if (!encounterId.success || !prescriptionId.success || !parsedBody.success) {
        return accountLinkJson(
          {
            error: {
              code: "INVALID_DOCTOR_PRESCRIPTION_ISSUE_REQUEST",
              message: "Provide valid Encounter and prescription IDs and an empty JSON object. Status, issuer, and issue time are server-controlled.",
            },
          },
          400,
        );
      }

      const result = await issueDoctorPrescription(
        encounterId.data,
        prescriptionId.data,
        actor.employeeId,
      );
      return accountLinkJson({ success: true, ...result }, 200);
    },
    toDoctorPrescriptionErrorResponse,
  )(request);
}
