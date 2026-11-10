import { createHash } from "node:crypto";
import { PatientDocumentError } from "./patient-document-errors";

export const MAX_PATIENT_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_PATIENT_DOCUMENT_REQUEST_BYTES = MAX_PATIENT_DOCUMENT_BYTES + 64 * 1024;

const ALLOWED_TYPES = {
  pdf: { mimeType: "application/pdf", signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  jpg: { mimeType: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
  jpeg: { mimeType: "image/jpeg", signature: [0xff, 0xd8, 0xff] },
  png: { mimeType: "image/png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
} as const;

export interface PatientDocumentFileInput {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}

export interface ValidatedPatientDocument {
  originalFileName: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  sizeBytes: number;
  checksumSha256: string;
  bytes: Uint8Array;
}

export function sanitizePatientDocumentFileName(value: string): string {
  const finalSegment = value.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = finalSegment
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned || cleaned === "." || cleaned === "..") return "patient-document";
  return cleaned.slice(0, 200);
}

function hasSignature(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

export function validatePatientDocument(input: PatientDocumentFileInput): ValidatedPatientDocument {
  if (!(input.bytes instanceof Uint8Array) || input.bytes.length === 0) {
    throw new PatientDocumentError("INVALID_PATIENT_DOCUMENT", "The uploaded file is empty or invalid.");
  }
  if (input.bytes.length > MAX_PATIENT_DOCUMENT_BYTES) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_TOO_LARGE", "The file exceeds the 10 MiB limit.");
  }

  const originalFileName = sanitizePatientDocumentFileName(input.fileName);
  const extension = originalFileName.includes(".")
    ? originalFileName.split(".").pop()!.toLowerCase()
    : "";
  const type = ALLOWED_TYPES[extension as keyof typeof ALLOWED_TYPES];
  if (!type) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_TYPE_NOT_ALLOWED", "Only PDF, JPEG, and PNG files are accepted.");
  }

  const suppliedMime = input.mimeType.trim().toLowerCase();
  const neutralMime = suppliedMime === "" || suppliedMime === "application/octet-stream";
  if (!neutralMime && suppliedMime !== type.mimeType) {
    throw new PatientDocumentError("INVALID_PATIENT_DOCUMENT", "The file extension and media type do not match.");
  }
  if (!hasSignature(input.bytes, type.signature)) {
    throw new PatientDocumentError("INVALID_PATIENT_DOCUMENT", "The file content does not match its declared type.");
  }

  const bytes = new Uint8Array(input.bytes);
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    originalFileName,
    mimeType: type.mimeType,
    sizeBytes: bytes.byteLength,
    checksumSha256,
    bytes,
  };
}
