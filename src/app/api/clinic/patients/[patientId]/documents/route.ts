import { assertAccountLinkOrigin } from "../../../../../../server/auth/account-linking/common";
import { withEmployeePermissionRoute } from "../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../server/auth/authorization/types";
import { patientManagementJson } from "../../../../../../server/patient-management/http";
import { parsePatientDocumentUpload, toPatientDocumentHttpErrorResponse } from "../../../../../../server/patient-management/patient-document-http";
import { listPatientDocuments, uploadPatientDocument } from "../../../../../../server/patient-management/patient-documents";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_DOCUMENT_READ,
    async (_securedRequest, actor): Promise<Response> => patientManagementJson({ data: await listPatientDocuments(patientId, actor.employeeId) }),
    toPatientDocumentHttpErrorResponse,
  )(_request);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { patientId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_DOCUMENT_UPLOAD,
    async (securedRequest, actor): Promise<Response> => {
      assertAccountLinkOrigin(securedRequest);
      const input = await parsePatientDocumentUpload(securedRequest);
      const data = await uploadPatientDocument(patientId, actor.employeeId, input);
      return patientManagementJson({ data, message: "Patient document uploaded." }, 201);
    },
    toPatientDocumentHttpErrorResponse,
  )(request);
}
