import { describe, expect, it } from "vitest";
import {
  MAX_PATIENT_DOCUMENT_BYTES,
  sanitizePatientDocumentFileName,
  validatePatientDocument,
} from "../../src/server/patient-management/patient-document-validation";
import { PatientDocumentError } from "../../src/server/patient-management/patient-document-errors";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("patient document validation", () => {
  it("accepts a PDF with a matching MIME type", () => expect(validatePatientDocument({ fileName: "scan.pdf", mimeType: "application/pdf", bytes: pdf }).mimeType).toBe("application/pdf"));
  it("accepts a JPEG", () => expect(validatePatientDocument({ fileName: "photo.jpg", mimeType: "image/jpeg", bytes: jpeg }).mimeType).toBe("image/jpeg"));
  it("accepts a PNG", () => expect(validatePatientDocument({ fileName: "photo.png", mimeType: "image/png", bytes: png }).mimeType).toBe("image/png"));
  it("normalizes an uppercase extension", () => expect(validatePatientDocument({ fileName: "SCAN.PDF", mimeType: "application/pdf", bytes: pdf }).originalFileName).toBe("SCAN.PDF"));
  it("accepts a neutral octet-stream MIME when the extension and signature agree", () => expect(validatePatientDocument({ fileName: "scan.pdf", mimeType: "application/octet-stream", bytes: pdf }).mimeType).toBe("application/pdf"));
  it("accepts a missing MIME type when the extension and signature agree", () => expect(validatePatientDocument({ fileName: "scan.pdf", mimeType: "", bytes: pdf }).mimeType).toBe("application/pdf"));
  it("rejects an empty file", () => expect(() => validatePatientDocument({ fileName: "scan.pdf", mimeType: "application/pdf", bytes: new Uint8Array() })).toThrow(PatientDocumentError));
  it("rejects a file above 10 MiB", () => expect(() => validatePatientDocument({ fileName: "scan.pdf", mimeType: "application/pdf", bytes: new Uint8Array(MAX_PATIENT_DOCUMENT_BYTES + 1) })).toThrow(PatientDocumentError));
  it("rejects unsupported extensions", () => expect(() => validatePatientDocument({ fileName: "scan.docx", mimeType: "application/pdf", bytes: pdf })).toThrow(PatientDocumentError));
  it("rejects an extension and MIME mismatch", () => expect(() => validatePatientDocument({ fileName: "scan.pdf", mimeType: "image/png", bytes: pdf })).toThrow(PatientDocumentError));
  it("rejects a signature mismatch", () => expect(() => validatePatientDocument({ fileName: "scan.pdf", mimeType: "application/pdf", bytes: png })).toThrow(PatientDocumentError));
  it("rejects a disguised executable", () => expect(() => validatePatientDocument({ fileName: "scan.jpg", mimeType: "image/jpeg", bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]) })).toThrow(PatientDocumentError));
  it("strips path segments from filenames", () => expect(sanitizePatientDocumentFileName("C:\\temp\\patient.pdf")).toBe("patient.pdf"));
  it("removes control characters from filenames", () => expect(sanitizePatientDocumentFileName("pa\ntient.pdf")).toBe("patient.pdf"));
  it("replaces header-sensitive filename characters", () => expect(sanitizePatientDocumentFileName('a"b?.pdf')).toBe("a_b_.pdf"));
  it("uses a safe fallback for an empty filename", () => expect(sanitizePatientDocumentFileName("../")).toBe("patient-document"));
  it("calculates a lowercase SHA-256 checksum", () => expect(validatePatientDocument({ fileName: "scan.pdf", mimeType: "application/pdf", bytes: pdf }).checksumSha256).toMatch(/^[a-f0-9]{64}$/));
});
