import { withPatientPortalRoute } from "../../../../../server/auth/authorization/route-guards";
import {
  AccountLinkError,
  accountLinkJson,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../../../../../server/auth/account-linking/common";
import { createPatientComplaint, getPatientComplaints } from "../../../../../server/patient-portal/update76-read-model";
import { createPatientComplaintSchema } from "../../../../../server/patient-portal/update76-validation";

export const runtime = "nodejs";

export const GET = withPatientPortalRoute(
  async (_request, actor): Promise<Response> => {
    const complaints = await getPatientComplaints(actor.patientId);
    return accountLinkJson({ complaints });
  },
  toAccountLinkErrorResponse,
);

export const POST = withPatientPortalRoute(
  async (request, actor): Promise<Response> => {
    assertAccountLinkOrigin(request);
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new AccountLinkError("JSON_REQUIRED", "Send the complaint as JSON.", 415);
    }
    const body: unknown = await request.json().catch(() => null);
    const parsed = createPatientComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return accountLinkJson({
        error: {
          code: "INVALID_COMPLAINT",
          message: "Provide a complaint category, a subject, and a description of at least 20 characters.",
        },
      }, 400);
    }
    const complaint = await createPatientComplaint(actor.patientId, parsed.data);
    return accountLinkJson({ success: true, complaint }, 201);
  },
  toAccountLinkErrorResponse,
);
