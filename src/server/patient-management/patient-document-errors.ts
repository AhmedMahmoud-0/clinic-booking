export type PatientDocumentErrorCode =
  | "INVALID_PATIENT_DOCUMENT"
  | "PATIENT_DOCUMENT_TOO_LARGE"
  | "PATIENT_DOCUMENT_TYPE_NOT_ALLOWED"
  | "ACTIVE_PATIENT_REQUIRED"
  | "PATIENT_DOCUMENT_NOT_FOUND"
  | "PATIENT_DOCUMENT_STORAGE_UNAVAILABLE"
  | "PATIENT_DOCUMENT_INTEGRITY_FAILED";

const STATUS_BY_CODE: Record<PatientDocumentErrorCode, number> = {
  INVALID_PATIENT_DOCUMENT: 400,
  PATIENT_DOCUMENT_TOO_LARGE: 413,
  PATIENT_DOCUMENT_TYPE_NOT_ALLOWED: 415,
  ACTIVE_PATIENT_REQUIRED: 404,
  PATIENT_DOCUMENT_NOT_FOUND: 404,
  PATIENT_DOCUMENT_STORAGE_UNAVAILABLE: 503,
  PATIENT_DOCUMENT_INTEGRITY_FAILED: 503,
};

export class PatientDocumentError extends Error {
  readonly code: PatientDocumentErrorCode;
  readonly status: number;

  constructor(code: PatientDocumentErrorCode, message: string) {
    super(message);
    this.name = "PatientDocumentError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
