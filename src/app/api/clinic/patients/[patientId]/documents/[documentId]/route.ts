import { withEmployeePermissionRoute } from "../../../../../../../server/auth/authorization/route-guards";
import { CLINIC_PERMISSIONS } from "../../../../../../../server/auth/authorization/types";
import { getPatientDocumentDownload } from "../../../../../../../server/patient-management/patient-documents";
import { toPatientDocumentHttpErrorResponse } from "../../../../../../../server/patient-management/patient-document-http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ patientId: string; documentId: string }> };

function encodeDownloadFileName(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150) || "patient-document";
  const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { patientId, documentId } = await context.params;
  return withEmployeePermissionRoute(
    CLINIC_PERMISSIONS.PATIENT_DOCUMENT_READ,
    async (_securedRequest, actor): Promise<Response> => {
      const document = await getPatientDocumentDownload(patientId, documentId, actor.employeeId);
      const responseBuffer = new ArrayBuffer(document.bytes.byteLength);
      new Uint8Array(responseBuffer).set(document.bytes);
      return new Response(responseBuffer, {
        status: 200,
        headers: {
          "Content-Type": document.mimeType,
          "Content-Length": String(document.sizeBytes),
          "Content-Disposition": encodeDownloadFileName(document.fileName),
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox",
        },
      });
    },
    toPatientDocumentHttpErrorResponse,
  )(_request);
}
