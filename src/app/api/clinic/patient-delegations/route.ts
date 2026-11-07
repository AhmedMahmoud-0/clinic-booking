import { withEmployeePermissionRoute } from "../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../server/auth/authorization/types";
import {
  accountLinkJson,
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../server/auth/account-linking/common";
import {
  createPatientAccessGrant,
  listPatientAccessGrants,
} from "../../../../server/auth/delegation/patient-delegation";
import { createPatientDelegationSchema } from "../../../../server/auth/delegation/patient-delegation-validation";

export const runtime = "nodejs";

/** List the grants for one subject patient using a minimal staff DTO. */
export const GET = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE,
  async (request): Promise<Response> => {
    const subjectPatientId = new URL(request.url).searchParams.get("subjectPatientId")?.trim();
    if (!subjectPatientId) {
      return accountLinkJson({
        error: { code: "SUBJECT_PATIENT_REQUIRED", message: "Provide a subject patient ID." },
      }, 400);
    }

    const result = await listPatientAccessGrants(subjectPatientId);
    return accountLinkJson(result);
  },
  toAccountLinkErrorResponse,
);

/** Create a guardian grant or an adult grant awaiting the subject patient's approval. */
export const POST = withEmployeePermissionRoute(
  CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE,
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);

    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the request as JSON.", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = createPatientDelegationSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_REQUEST",
          message: "The patient delegation details are invalid. Check the patient IDs, exact scopes, expiry, and reason.",
        },
      }, 400);
    }

    const result = await createPatientAccessGrant(parsed.data, actor.employeeId);
    return accountLinkJson({ success: true, ...result }, 201);
  },
  toAccountLinkErrorResponse,
);
