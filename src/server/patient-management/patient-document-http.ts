import { PatientDocumentError } from "./patient-document-errors";
import { MAX_PATIENT_DOCUMENT_REQUEST_BYTES } from "./patient-document-validation";
import { patientManagementJson } from "./http";
import { toPatientContactConsentErrorResponse } from "./patient-contact-consent-http";

export async function parsePatientDocumentUpload(request: Request): Promise<{ fileName: string; mimeType: string; bytes: Uint8Array }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new PatientDocumentError("INVALID_PATIENT_DOCUMENT", "Send exactly one file using multipart form data.");
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_PATIENT_DOCUMENT_REQUEST_BYTES) {
      throw new PatientDocumentError("PATIENT_DOCUMENT_TOO_LARGE", "The upload request exceeds the 10 MiB file limit.");
    }
  }

  const reader = request.body?.getReader();
  if (!reader) throw new PatientDocumentError("INVALID_PATIENT_DOCUMENT", "The upload request has no file body.");
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_PATIENT_DOCUMENT_REQUEST_BYTES) {
        await reader.cancel();
        throw new PatientDocumentError("PATIENT_DOCUMENT_TOO_LARGE", "The upload request exceeds the 10 MiB file limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bodyBuffer = new ArrayBuffer(totalBytes);
  const body = new Uint8Array(bodyBuffer);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let formData: FormData;
  try {
    formData = await new Response(bodyBuffer, { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new PatientDocumentError("INVALID_PATIENT_DOCUMENT", "The multipart upload could not be read.");
  }
  const entries = [...formData.entries()];
  if (entries.length !== 1 || entries[0][0] !== "file" || typeof entries[0][1] === "string") {
    throw new PatientDocumentError("INVALID_PATIENT_DOCUMENT", "The request must contain exactly one file field named 'file'.");
  }
  const file = entries[0][1];
  if (file.size > MAX_PATIENT_DOCUMENT_REQUEST_BYTES) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_TOO_LARGE", "The file exceeds the 10 MiB limit.");
  }
  return { fileName: file.name, mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export function toPatientDocumentHttpErrorResponse(error: unknown): Response {
  if (error instanceof PatientDocumentError) {
    return patientManagementJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  return toPatientContactConsentErrorResponse(error);
}
